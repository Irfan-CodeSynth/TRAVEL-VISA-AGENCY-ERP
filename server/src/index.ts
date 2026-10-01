import './load-env';

import { app } from './app';
import { config } from './config';
import { prisma } from './lib/prisma';

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('📦 Connected to database');

    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port} [${config.env}]`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
