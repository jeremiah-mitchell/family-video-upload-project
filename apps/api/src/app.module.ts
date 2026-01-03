import { Module } from '@nestjs/common';
import { AppConfigModule } from './config';
import { HealthModule } from './health';
import { JellyfinModule } from './jellyfin';
import { VideosModule } from './videos';

@Module({
  imports: [AppConfigModule, HealthModule, JellyfinModule, VideosModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
