const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger-spec.json');
require('dotenv').config();

const initDatabase = require('./config/init-db');

// Instantiate App
const app = express();
const PORT = process.env.PORT || 5000;

// Apply Middlewares
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(',').map(o => o.trim())
    : '*',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation Route
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    timestamp: new Date(),
    environment: process.env.NODE_ENV
  });
});

// Mount routes
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

const vaultRoutes = require('./routes/vault.routes');
app.use('/api/vault', vaultRoutes);

const folderRoutes = require('./routes/folder.routes');
app.use('/api/folders', folderRoutes);

const adminRoutes = require('./routes/admin.routes');
app.use('/api/admin', adminRoutes);

// Global 404 Route
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

// Global Error Handler Middleware
const globalErrorHandler = require('./middlewares/error.middleware');
app.use(globalErrorHandler);

// Start Server after DB connection
const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`[Server] Running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('[DB] Connection failed. Server startup aborted.', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app; // For testing
