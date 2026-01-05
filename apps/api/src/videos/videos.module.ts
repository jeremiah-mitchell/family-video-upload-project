import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { JellyfinModule } from '../jellyfin';
import { AppConfigModule } from '../config';
import { NfoModule } from '../nfo';

@Module({
  imports: [JellyfinModule, AppConfigModule, NfoModule],
  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
