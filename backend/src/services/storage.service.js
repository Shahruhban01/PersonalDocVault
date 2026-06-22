/**
 * @fileoverview Storage Service interfacing with Cloudflare R2 using AWS S3 SDK.
 */

const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/r2');
const logger = require('../config/logger');

class StorageService {
  constructor() {
    this.bucketName = process.env.R2_BUCKET_NAME;
  }

  /**
   * Upload an encrypted binary payload directly to Cloudflare R2.
   * @param {string} key - R2 path file key.
   * @param {Buffer} body - File binary buffer.
   * @param {string} contentType - File content MIME type.
   * @returns {Promise<void>}
   */
  async uploadFile(key, body, contentType) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType
      });
      await s3Client.send(command);
      logger.debug(`[R2] File uploaded successfully to key: ${key}`);
    } catch (error) {
      logger.error(`[R2] File upload failed for key ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a short-lived presigned download URL for a file in R2.
   * @param {string} key - R2 path file key.
   * @param {number} [expiresInSeconds=300] - Link expiration (default: 5m).
   * @returns {Promise<string>}
   */
  async getPresignedDownloadUrl(key, expiresInSeconds = 300) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    } catch (error) {
      logger.error(`[R2] Presigned URL generation failed for key ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete an object from Cloudflare R2 bucket.
   * @param {string} key - R2 path file key.
   * @returns {Promise<void>}
   */
  async deleteFile(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      await s3Client.send(command);
      logger.info(`[R2] File deleted successfully from key: ${key}`);
    } catch (error) {
      logger.error(`[R2] File deletion failed for key ${key}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new StorageService();
