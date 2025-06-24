import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AIBuddyController } from './aibuddy.controller';
import { AIBuddyService } from './aibuddy.service';
import { Chemistry, ChemistrySchema } from './schemas/chemistry.schema';
import { MathAI, MathSchema } from './schemas/math.schema';
import { Physics, PhysicsSchema } from './schemas/physics.schema';
import { Limit, LimitSchema } from './schemas/limit.schema';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([
      { name: Chemistry.name, schema: ChemistrySchema },
      { name: MathAI.name, schema: MathSchema },
      { name: Physics.name, schema: PhysicsSchema },
      { name: Limit.name, schema: LimitSchema },
    ]),
  ],
  controllers: [AIBuddyController],
  providers: [AIBuddyService],
})
export class AIBuddyModule {} 