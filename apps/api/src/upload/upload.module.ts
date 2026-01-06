import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { JellyfinModule } from '../jellyfin';
import { AppConfigModule } from '../config';

@Module({
  imports: [JellyfinModule, AppConfigModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
