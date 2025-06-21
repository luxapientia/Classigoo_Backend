import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { ClassroomPost, ClassroomPostSchema } from './schemas/classroom-post.schema';
import { ClassroomPostComment, ClassroomPostCommentSchema } from './schemas/classroom-post-comment.schema';
import { Classroom, ClassroomSchema } from '../core/schemas/classroom.schema';
import { ClassroomAccess, ClassroomAccessSchema } from '../core/schemas/classroom-access.schema';
import { Notification, NotificationSchema } from '../member/schemas/notification.schema';
import { SharedModule } from '../../../shared/shared.module';

@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([
      { name: ClassroomPost.name, schema: ClassroomPostSchema },
      { name: ClassroomPostComment.name, schema: ClassroomPostCommentSchema },
      { name: Classroom.name, schema: ClassroomSchema },
      { name: ClassroomAccess.name, schema: ClassroomAccessSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {} 