import { Module } from '@nestjs/common';
import { AppConfigModule } from './config';
import { HealthModule } from './health';
import { JellyfinModule } from './jellyfin';
import { VideosModule } from './videos';
import { UploadModule } from './upload';

@Module({
  imports: [AppConfigModule, HealthModule, JellyfinModule, VideosModule, UploadModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
