import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get typed configuration
  const configService = app.get(AppConfigService);

  // Enable CORS for frontend
  app.enableCors({
    origin: configService.corsOrigin,
  });

  const port = configService.port;
  await app.listen(port);

  // Log startup info (never log sensitive values like API keys)
  console.log(`API running on http://localhost:${port}`);
  console.log(`CORS origin: ${configService.corsOrigin}`);
  console.log(`Jellyfin URL: ${configService.jellyfinUrl}`);
  console.log(`Media path: ${configService.mediaPath}`);
}
bootstrap();
