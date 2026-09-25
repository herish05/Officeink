import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { FileMetadata } from '../models/FileMetadata';
import { ConversationMember } from '../models/ConversationMember';
import { ENV } from '../config/env';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAuditEvent } from '../utils/audit';
import logger from '../utils/logger';

// Helper to format path as YYYY/MM/DD
const getStorageSubdir = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return path.join(String(year), month, day);
};

export const uploadChunk = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const { fileId, originalName, mimeType, totalChunks, chunkIndex, totalSize, conversationId } = req.body;
    const chunkFile = req.file;

    if (!fileId || !chunkFile || chunkIndex === undefined || !totalChunks || !conversationId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing chunk metadata parameters' } });
      return;
    }

    // Verify conversation membership
    const isMember = await ConversationMember.findOne({ conversationId, userId }).lean();
    if (!isMember) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You are not authorized to upload files to this conversation' } });
      return;
    }

    const tempDir = path.join(ENV.TEMP_CHUNK_DIR, fileId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const chunkPath = path.join(tempDir, `chunk_${chunkIndex}`);
    fs.copyFileSync(chunkFile.path, chunkPath);
    fs.unlinkSync(chunkFile.path); // Clean up multer temp file

    const parsedChunkIndex = parseInt(chunkIndex, 10);
    const parsedTotalChunks = parseInt(totalChunks, 10);

    // Check how many chunks have arrived
    const uploadedChunks = fs.readdirSync(tempDir).filter(f => f.startsWith('chunk_')).length;

    if (uploadedChunks < parsedTotalChunks) {
      res.json({
        success: true,
        data: {
          fileId,
          completed: false,
          progressPercent: Math.round((uploadedChunks / parsedTotalChunks) * 100),
          uploadedChunks,
          totalChunks: parsedTotalChunks
        }
      });
      return;
    }

    // All chunks received! Assemble file!
    const subDir = getStorageSubdir();
    const targetDir = path.join(ENV.STORAGE_DIR, subDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(originalName) || '';
    const uniqueStorageName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const finalFilePath = path.join(targetDir, uniqueStorageName);

    const writeStream = fs.createWriteStream(finalFilePath);
    const hash = crypto.createHash('sha256');

    for (let i = 0; i < parsedTotalChunks; i++) {
      const currentChunkPath = path.join(tempDir, `chunk_${i}`);
      const chunkBuffer = fs.readFileSync(currentChunkPath);
      writeStream.write(chunkBuffer);
      hash.update(chunkBuffer);
      fs.unlinkSync(currentChunkPath); // clean chunk
    }

    writeStream.end();
    fs.rmdirSync(tempDir); // clean temp directory

    const checksum = hash.digest('hex');
    const stats = fs.statSync(finalFilePath);

    const fileMeta = await FileMetadata.create({
      originalName,
      storageName: uniqueStorageName,
      mimeType: mimeType || 'application/octet-stream',
      size: stats.size,
      senderId: new Types.ObjectId(userId),
      conversationId: new Types.ObjectId(conversationId),
      storagePath: path.join(subDir, uniqueStorageName),
      checksum,
      isCompleted: true,
      totalChunks: parsedTotalChunks,
      uploadedChunks: parsedTotalChunks
    });

    await logAuditEvent({
      actorId: userId,
      actorName: req.user?.name,
      action: 'FILE_UPLOAD',
      resourceType: 'FILE',
      resourceId: fileMeta._id.toString(),
      details: { originalName, sizeBytes: stats.size, conversationId }
    });

    res.json({
      success: true,
      data: {
        fileId: fileMeta._id.toString(),
        completed: true,
        originalName: fileMeta.originalName,
        size: fileMeta.size,
        mimeType: fileMeta.mimeType,
        checksum: fileMeta.checksum,
        url: `/api/files/${fileMeta._id.toString()}/download`
      }
    });
  } catch (error: any) {
    logger.error(`[FileController] uploadChunk error: ${error.message}`);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const downloadFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const id = String(req.params.id);

    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const fileMeta = await FileMetadata.findById(id).lean();
    if (!fileMeta) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
      return;
    }

    // Permission Verification: Check if user is sender, admin, or member of conversation
    let isAuthorized = req.user?.role === 'ADMIN' || fileMeta.senderId.toString() === userId;

    if (!isAuthorized) {
      const membership = await ConversationMember.findOne({
        conversationId: fileMeta.conversationId,
        userId
      }).lean();

      if (membership) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      await logAuditEvent({
        actorId: userId,
        actorName: req.user?.name,
        action: 'UNAUTHORIZED_FILE_ACCESS_ATTEMPT',
        resourceType: 'FILE',
        resourceId: id,
        ipAddress: req.ip || '127.0.0.1'
      });
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied. You do not have permission to download this file.' } });
      return;
    }

    const absolutePath = path.join(ENV.STORAGE_DIR, fileMeta.storagePath);
    if (!fs.existsSync(absolutePath)) {
      res.status(404).json({ success: false, error: { code: 'FILE_MISSING_ON_DISK', message: 'Physical file is unavailable on server storage' } });
      return;
    }

    const stat = fs.statSync(absolutePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    await logAuditEvent({
      actorId: userId,
      actorName: req.user?.name,
      action: 'FILE_DOWNLOAD',
      resourceType: 'FILE',
      resourceId: id,
      details: { originalName: fileMeta.originalName, sizeBytes: fileSize }
    });

    // Support HTTP Range requests for video/audio seek & progressive streaming
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(absolutePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': fileMeta.mimeType,
      };
      res.writeHead(206, head);
      file.pipe(res);
      return;
    }

    res.setHeader('Content-Type', fileMeta.mimeType);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileMeta.originalName)}"`);

    const readStream = fs.createReadStream(absolutePath);
    readStream.pipe(res);
  } catch (error: any) {
    logger.error(`[FileController] downloadFile error: ${error.message}`);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const previewFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const fileMeta = await FileMetadata.findById(id).lean();
    if (!fileMeta) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
      return;
    }

    const isMember = req.user?.role === 'ADMIN' || fileMeta.senderId.toString() === userId ||
      !!(await ConversationMember.findOne({ conversationId: fileMeta.conversationId, userId }).lean());

    if (!isMember) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
      return;
    }

    const absolutePath = path.join(ENV.STORAGE_DIR, fileMeta.storagePath);
    if (!fs.existsSync(absolutePath)) {
      res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'File deleted from disk' } });
      return;
    }

    res.setHeader('Content-Type', fileMeta.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileMeta.originalName)}"`);
    fs.createReadStream(absolutePath).pipe(res);
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
