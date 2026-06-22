/**
 * @fileoverview Database Initialization and Seeding Script.
 */

const mongoose = require('mongoose');
const connectDB = require('./db');
const DocumentCategory = require('../models/category.model');
const logger = require('./logger');

const systemCategories = [
  { name: 'Identity Documents', slug: 'identity-documents', isSystem: true },
  { name: 'Insurance Documents', slug: 'insurance-documents', isSystem: true },
  { name: 'Medical Records', slug: 'medical-records', isSystem: true },
  { name: 'Certificates', slug: 'certificates', isSystem: true }
];

/**
 * Perform database index synchronization and seed standard system metadata.
 */
const initDatabase = async () => {
  try {
    // 1. Establish DB Connection
    await connectDB();

    // 2. Synchronize Mongoose Schema Indexes
    logger.info('[DB] Synchronizing database indexes...');
    await mongoose.connection.syncIndexes();
    logger.info('[DB] Database indexes synchronized successfully.');

    // 3. Seed Default System Document Categories
    logger.info('[DB] Verifying system document categories seed...');
    for (const cat of systemCategories) {
      const existing = await DocumentCategory.findOne({ slug: cat.slug });
      if (!existing) {
        await DocumentCategory.create(cat);
        logger.info(`[DB-Seed] Created default system category: ${cat.name}`);
      }
    }
    logger.info('[DB] System categories seed check completed.');
  } catch (error) {
    logger.error('[DB] Initialization failed:', error);
    throw error;
  }
};

module.exports = initDatabase;
