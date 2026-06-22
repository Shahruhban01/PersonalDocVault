const { S3Client } = require('@aws-sdk/client-s3');

// Cloudflare R2 requires the S3 client to be configured with the 'auto' region
// and custom credentials/endpoints.
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Needed for local testing or custom endpoints
});

module.exports = s3Client;
