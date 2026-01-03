import { Module } from '@nestjs/common';
import { AppConfigModule } from './config';
import { HealthModule } from './health';

@Module({
  imports: [AppConfigModule, HealthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
