import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.use(helmet());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const allowedOrigins = config.get<string>(
    'CORS_ORIGINS',
    'http://localhost:3000,http://localhost:8081',
  );
  app.enableCors({
    origin: allowedOrigins.split(',').map((o) => o.trim()),
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = config.get<number>('APP_PORT', 3000);
  await app.listen(port);
  logger.log(`WellVantage API running on port ${port}`);
}

bootstrap();
