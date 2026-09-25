import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env';
import { Department } from '../models/Department';
import { User } from '../models/User';
import { Conversation } from '../models/Conversation';
import { ConversationMember } from '../models/ConversationMember';
import { Message } from '../models/Message';
import logger from '../utils/logger';

const seed = async () => {
  try {
    await mongoose.connect(ENV.MONGODB_URI);
    logger.info('[Seed] Connected to MongoDB.');

    // Clear existing data
    await Department.deleteMany({});
    await User.deleteMany({});
    await Conversation.deleteMany({});
    await ConversationMember.deleteMany({});
    await Message.deleteMany({});

    logger.info('[Seed] Cleared existing database records.');

    // 1. Create Departments
    const devDept = await Department.create({ name: 'Development', code: 'DEV', description: 'Software Engineering & Build Infrastructure' });
    const qaDept = await Department.create({ name: 'Testing & QA', code: 'QA', description: 'Quality Assurance & Automated Testing' });
    const hrDept = await Department.create({ name: 'Human Resources', code: 'HR', description: 'Personnel Management & Operations' });
    const accDept = await Department.create({ name: 'Accounts', code: 'ACC', description: 'Finance, Payroll & Invoicing' });
    const mgmtDept = await Department.create({ name: 'Management', code: 'MGMT', description: 'Executive Operations & Strategy' });

    // Password Hash for "Admin@123" and "Pass@123"
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('Admin@123', salt);
    const employeePasswordHash = await bcrypt.hash('Pass@123', salt);

    // 2. Create Users
    const adminUser = await User.create({
      employeeId: 'EMP001',
      name: 'System Admin',
      username: 'admin',
      passwordHash: adminPasswordHash,
      departmentId: mgmtDept._id,
      role: 'ADMIN',
      designation: 'IT Systems Lead',
      phone: '9876543210',
      email: 'admin@company.local',
      statusText: 'Managing LAN Infrastructure 🚀'
    });

    const rahulUser = await User.create({
      employeeId: 'EMP102',
      name: 'Rahul Sharma',
      username: 'rahul',
      passwordHash: employeePasswordHash,
      departmentId: devDept._id,
      role: 'EMPLOYEE',
      designation: 'Senior Fullstack Engineer',
      phone: '9876543211',
      email: 'rahul@company.local',
      statusText: 'Working on OfficeLink builds 💻'
    });

    const amanUser = await User.create({
      employeeId: 'EMP103',
      name: 'Aman Kumar',
      username: 'aman',
      passwordHash: employeePasswordHash,
      departmentId: devDept._id,
      role: 'EMPLOYEE',
      designation: 'Backend Architect',
      phone: '9876543212',
      email: 'aman@company.local',
      statusText: 'Reviewing API performance ⚡'
    });

    const priyaUser = await User.create({
      employeeId: 'EMP104',
      name: 'Priya Singh',
      username: 'priya',
      passwordHash: employeePasswordHash,
      departmentId: qaDept._id,
      role: 'EMPLOYEE',
      designation: 'Lead QA Automation',
      phone: '9876543213',
      email: 'priya@company.local',
      statusText: 'Running test suites 🧪'
    });

    const herishUser = await User.create({
      employeeId: 'EMP105',
      name: 'Herish Patel',
      username: 'herish',
      passwordHash: employeePasswordHash,
      departmentId: hrDept._id,
      role: 'EMPLOYEE',
      designation: 'HR Specialist',
      phone: '9876543214',
      email: 'herish@company.local',
      statusText: 'Onboarding new hires 📋'
    });

    logger.info('[Seed] Created default Users and Departments.');

    // 3. Create Group Conversation: "Development Team"
    const devGroup = await Conversation.create({
      type: 'group',
      name: 'Development Team',
      createdBy: rahulUser._id,
      departmentId: devDept._id,
      lastMessageAt: new Date(),
      lastMessageSummary: 'Rahul: Please check the latest build.'
    });

    await ConversationMember.create([
      { conversationId: devGroup._id, userId: rahulUser._id, role: 'admin' },
      { conversationId: devGroup._id, userId: amanUser._id, role: 'member' },
      { conversationId: devGroup._id, userId: priyaUser._id, role: 'member' },
      { conversationId: devGroup._id, userId: adminUser._id, role: 'member' }
    ]);

    // Group Messages
    await Message.create([
      {
        conversationId: devGroup._id,
        senderId: rahulUser._id,
        type: 'text',
        content: 'Welcome everyone to the new OfficeLink air-gapped platform!',
        readBy: [rahulUser._id, amanUser._id, priyaUser._id],
        createdAt: new Date(Date.now() - 3600000)
      },
      {
        conversationId: devGroup._id,
        senderId: amanUser._id,
        type: 'text',
        content: 'Great! The instant Socket.IO messaging and LAN file transfers are working smoothly.',
        readBy: [rahulUser._id, amanUser._id],
        createdAt: new Date(Date.now() - 1800000)
      },
      {
        conversationId: devGroup._id,
        senderId: rahulUser._id,
        type: 'text',
        content: 'Please check the latest build.',
        readBy: [rahulUser._id],
        createdAt: new Date()
      }
    ]);

    // 4. Create 1-on-1 Direct Conversation: Rahul <-> Aman
    const direct1 = await Conversation.create({
      type: 'direct',
      createdBy: rahulUser._id,
      lastMessageAt: new Date(),
      lastMessageSummary: 'Aman: Sure, I will review the database backup.'
    });

    await ConversationMember.create([
      { conversationId: direct1._id, userId: rahulUser._id, role: 'admin' },
      { conversationId: direct1._id, userId: amanUser._id, role: 'member' }
    ]);

    await Message.create([
      {
        conversationId: direct1._id,
        senderId: rahulUser._id,
        type: 'text',
        content: 'Hi Aman, can you send me the database backup?',
        readBy: [rahulUser._id, amanUser._id],
        createdAt: new Date(Date.now() - 1200000)
      },
      {
        conversationId: direct1._id,
        senderId: amanUser._id,
        type: 'text',
        content: 'Sure, I will review the database backup.',
        readBy: [rahulUser._id, amanUser._id],
        createdAt: new Date(Date.now() - 600000)
      }
    ]);

    logger.info('====================================================');
    logger.info('🎉 SEEDING COMPLETE SUCCESSFULLY!');
    logger.info('====================================================');
    logger.info('Accounts created:');
    logger.info('  1. ADMIN:    ID: EMP001 | Password: Admin@123 (System Admin)');
    logger.info('  2. RAHUL:    ID: EMP102 | Password: Pass@123 (Rahul Sharma)');
    logger.info('  3. AMAN:     ID: EMP103 | Password: Pass@123 (Aman Kumar)');
    logger.info('  4. PRIYA:    ID: EMP104 | Password: Pass@123 (Priya Singh)');
    logger.info('  5. HERISH:   ID: EMP105 | Password: Pass@123 (Herish Patel)');
    logger.info('====================================================');

    process.exit(0);
  } catch (err: any) {
    logger.error(`[Seed Error] ${err.message}`);
    process.exit(1);
  }
};

seed();
