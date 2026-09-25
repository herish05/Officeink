import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { ENV } from '../config/env';
import { uploadChunk, downloadFile, previewFile } from '../controllers/file.controller';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

const upload = multer({
  dest: ENV.TEMP_CHUNK_DIR,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB chunk limit
});

router.use(authenticateJWT);

router.post('/upload-chunk', upload.single('chunk'), uploadChunk);
router.get('/:id/download', downloadFile);
router.get('/:id/preview', previewFile);

export default router;
