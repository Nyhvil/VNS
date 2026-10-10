// src/main.ts

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as os from 'os';
import { json, urlencoded } from 'express';
import { AppModule } from './config/app/app.module';
import { setupSwagger } from './config/swagger/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const logger = new Logger('Bootstrap');

  const port = process.env.PORT || 5000;
  const env = process.env.NODE_ENV || 'development';

  // ================= BODY SIZE =================
  app.use(json({ limit: '20mb' }));
  app.use(urlencoded({ limit: '20mb', extended: true }));

  // ================= CORS =================
  const defaultCorsOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3100',
    'http://127.0.0.1:3100',
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:31000',
    'http://127.0.0.1:31000',
    'http://localhost:40000',
    'http://127.0.0.1:40000',
  ];

  const corsOrigins =
    process.env.CORS_ORIGIN?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? defaultCorsOrigins;

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // ================= PREFIX =================
  app.setGlobalPrefix('api');

  // ================= SWAGGER =================
  setupSwagger(app);

  // ================= LISTEN =================
  await app.listen(port);

  // ================= URL =================
  const url = await app.getUrl();

  // ================= LOG =================
  logger.log('=========== SERVER =================');
  logger.log(`🌐 ${url}`);
  logger.log(`📘 Swagger: ${url}/api/docs`);
  logger.log(`⚙️  ${env} | Port: ${port} | PID: ${process.pid}`);
  logger.log(`📦 Node: ${process.version} | ${process.platform}`);
  logger.log(`💻 ${os.hostname()} | CPU: ${os.cpus().length}`);
  logger.log(
    `💾 RAM: ${(os.freemem() / 1024 ** 3).toFixed(2)} / ${(os.totalmem() / 1024 ** 3).toFixed(2)} GB`,
  );

  logger.log('=========== CONFIG =================');
  logger.log(
    `ENV: DB=${process.env.DATABASE_URL ? 'OK' : 'MISSING'} | PIPELINE=${process.env.PIPELINE_URL ? 'OK' : 'MISSING'} | JWT=${process.env.JWT_SECRET ? 'OK' : 'MISSING'}`,
  );

  logger.log('====================================');
}

void bootstrap();
