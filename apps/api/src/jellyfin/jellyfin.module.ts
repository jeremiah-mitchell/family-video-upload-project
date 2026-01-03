import { Module } from '@nestjs/common';
import { JellyfinService } from './jellyfin.service';
import { AppConfigModule } from '../config';

@Module({
  imports: [AppConfigModule],
  providers: [JellyfinService],
  exports: [JellyfinService],
})
export class JellyfinModule {}
