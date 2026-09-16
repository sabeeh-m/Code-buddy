import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { PlannerService } from './planner.service';

@Module({
  controllers: [AgentController],
  providers: [PlannerService],
})
export class AgentModule {}
