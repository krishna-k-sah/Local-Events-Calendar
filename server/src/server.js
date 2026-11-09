import dotenv from 'dotenv';
dotenv.config();

import { validateEnvironment } from './config/envValidator.js';
validateEnvironment();

import app from './app.js';
import { startReminderScheduler, stopReminderScheduler } from './services/reminderService.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 EventHub Backend Server listening on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Base API URL: http://localhost:${PORT}/api`);

  // Start background reminder worker in non-test mode
  if (process.env.NODE_ENV !== 'test') {
    startReminderScheduler(15 * 60 * 1000);
    console.log(`⏰ Automated Event Reminder Worker active (15m interval)`);
  }
});

const handleShutdown = () => {
  console.log('🛑 Graceful shutdown initiated. Stopping reminder worker...');
  stopReminderScheduler();
  server.close(() => {
    console.log('💤 Server successfully closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);
