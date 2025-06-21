import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SharedModule } from '../../shared/shared.module';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
