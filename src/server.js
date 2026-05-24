import express from 'express';
import cors from 'cors';

import { config } from './config/env.js';
import webhookRoutes from './routes/webhook.routes.js';
import ragRoutes from './routes/rag.routes.js';

const app = express();

app.use(cors());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use((req, res, next) => {
  console.log(`\n➡️ ${req.method} ${req.url}`);
  next();
});

/**
 * Health Check
 */
app.get('/health', (req, res) => {
  console.log('✅ Health check endpoint hit');

  return res.status(200).json({
    success: true,
    message: 'GitSense AI server is running',
  });
});

/**
 * Webhook Routes
 */
app.use('/api/webhooks', webhookRoutes);
app.use('/api/rag', ragRoutes);

/**
 * 404 Route
 */
app.use((req, res) => {
  console.log(`❌ Route Not Found: ${req.method} ${req.url}`);

  return res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
  console.error('\n❌ GLOBAL SERVER ERROR');
  console.error(err);

  return res.status(500).json({
    success: false,
    message: 'Internal Server Error',
  });
});

app.listen(config.port, () => {
  console.log(
    `\n🚀 GitSense AI Server running on port ${config.port}`
  );

  console.log(
    `🌐 Health Check: http://localhost:${config.port}/health`
  );
});

/**
 * Prevent process exit during development
 */
setInterval(() => {}, 1000 * 60 * 60);
