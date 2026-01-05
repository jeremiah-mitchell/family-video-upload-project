import { Module } from '@nestjs/common';
import { NfoService } from './nfo.service';
import { AppConfigModule } from '../config';

@Module({
  imports: [AppConfigModule],
  providers: [NfoService],
  exports: [NfoService],
})
export class NfoModule {}
