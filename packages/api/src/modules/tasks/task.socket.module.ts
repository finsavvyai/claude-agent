import { Module } from '@nestjs/common';
import { TasksModule } from './tasks.module';
import { TaskGateway } from './task.gateway';

@Module({
  imports: [TasksModule],
  providers: [TaskGateway],
  exports: [TaskGateway],
})
export class TaskSocketModule {}
