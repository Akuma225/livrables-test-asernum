import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import * as multipart from '@fastify/multipart';
import { AppModule } from './app.module';

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const HTTP_METHODS = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'] as const;

const config = {
  port: process.env.APP_PORT || 3000,
  apiPrefix: 'api',
  apiVersion: '1',
  docsPrefix: 'docs',
  requestTimeoutMinutes: 5,
  maxFileSize: 100 * 1024 * 1024, // 100MB
};

// ─────────────────────────────────────────────────────────────
// Setup Functions
// ─────────────────────────────────────────────────────────────

function setupBigIntSerialization(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

function createFastifyAdapter(): FastifyAdapter {
  return new FastifyAdapter({
    logger: false,
    trustProxy: true,
    requestTimeout: config.requestTimeoutMinutes * 60 * 1000,
  });
}

function applyFastifyPolyfill(app: NestFastifyApplication): void {
  const fastifyInstance: any = app.getHttpAdapter().getInstance();
  if (!fastifyInstance.supportedMethods) {
    fastifyInstance.supportedMethods = [...HTTP_METHODS];
  }
}

async function registerMultipart(app: NestFastifyApplication): Promise<void> {
  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(multipart as any, {
    limits: { fileSize: config.maxFileSize },
  });
}

function setupSwagger(app: NestFastifyApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle(process.env.SWAGGER_TITLE || 'API Documentation Title')
    .setDescription(process.env.SWAGGER_DESCRIPTION || 'API Documentation Description')
    .setVersion(process.env.SWAGGER_VERSION || '1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Préfixer les chemins avec /api/v{version}
  document.paths = Object.keys(document.paths).reduce((acc, path) => {
    acc[`/${config.apiPrefix}/v${config.apiVersion}${path}`] = document.paths[path];
    return acc;
  }, {} as typeof document.paths);

  SwaggerModule.setup(config.docsPrefix, app, document);
}

function setupCors(app: NestFastifyApplication): void {
  app.enableCors({
    origin: '*',
    methods: [...HTTP_METHODS],
    allowedHeaders: [
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Diata-App-Token',
    ],
    credentials: true,
  });
}

function setupVersioning(app: NestFastifyApplication): void {
  app.setGlobalPrefix(config.apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: config.apiVersion,
  });
}

// ─────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  setupBigIntSerialization();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    createFastifyAdapter(),
  );

  applyFastifyPolyfill(app);
  await registerMultipart(app);

  setupSwagger(app);
  setupCors(app);
  setupVersioning(app);

  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');

  Logger.log(`🚀 Service is running on ${process.env.APP_BASE_URL}`);
  Logger.log(`🔗 Swagger Docs is running on ${process.env.APP_BASE_URL}/${config.docsPrefix}`);
}

bootstrap();
