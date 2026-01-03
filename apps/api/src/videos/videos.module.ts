import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { JellyfinModule } from '../jellyfin';
import { AppConfigModule } from '../config';

@Module({
  imports: [JellyfinModule, AppConfigModule],
  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
