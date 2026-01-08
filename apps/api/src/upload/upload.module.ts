import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { JellyfinModule } from '../jellyfin';
import { AppConfigModule } from '../config';
import { NfoModule } from '../nfo';

@Module({
  imports: [JellyfinModule, AppConfigModule, NfoModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
