import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '../config/config.module';
import { User, UserSchema } from '../modules/auth/schemas/user.schema';
import { Session, SessionSchema } from '../modules/auth/schemas/session.schema';
import { UserGuard } from './guards/user.guard';
import { FileService } from './services/file.service';
import { FileInterceptor } from './interceptors/file.interceptor';
import { PubSubService } from './services/pubsub.service';
import { KafkaPubSubService } from './services/kafka-pubsub.service';
import { EventsGateway } from './gateways/events.gateway';

const authModels = MongooseModule.forFeature([
  { name: User.name, schema: UserSchema },
  { name: Session.name, schema: SessionSchema },
]);

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({
      privateKey: process.env.JWT_PRIVATE_KEY,
      publicKey: process.env.JWT_PUBLIC_KEY,
      signOptions: { algorithm: 'RS256' },
      verifyOptions: { algorithms: ['RS256'] },
    }),
    authModels,
  ],
  providers: [UserGuard, FileService, FileInterceptor, PubSubService, EventsGateway, KafkaPubSubService],
  exports: [UserGuard, JwtModule, authModels, FileService, FileInterceptor, PubSubService, EventsGateway, KafkaPubSubService],
})
export class SharedModule {} 