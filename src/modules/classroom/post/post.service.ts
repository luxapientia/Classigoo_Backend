import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtPayload } from '../../../common/decorators/user.decorator';
import { ClassroomPost } from './schemas/classroom-post.schema';
import { ClassroomPostComment } from './schemas/classroom-post-comment.schema';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { User } from '../../auth/schemas/user.schema';
import { Notification } from '../member/schemas/notification.schema';
import { CreateClassroomPostDto } from './dto/create-classroom-post.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import * as DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { DeleteFileDto } from '../assignment/dto/delete-file.dto';
import { FileService } from '../../../shared/services/file.service';
import { PubSubService } from 'src/shared/services/pubsub.service';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(ClassroomPost.name) private classroomPostModel: Model<ClassroomPost>,
    @InjectModel(ClassroomPostComment.name) private classroomPostCommentModel: Model<ClassroomPostComment>,
    @InjectModel(Classroom.name) private classroomModel: Model<Classroom>,
    @InjectModel(ClassroomAccess.name) private classroomAccessModel: Model<ClassroomAccess>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    private fileService: FileService,
    private pubSubService: PubSubService
  ) {}

  async createPost(createPostDto: CreateClassroomPostDto, user: JwtPayload): Promise<{ status: string; message: string }> {
    try {
      const { classroom_id, content, files, audience, type, status, published_at } = createPostDto;

      // Validate content or files
      if (!content && (!files || files.length === 0)) {
        throw new BadRequestException('Content or files are required');
      }

      // Check if classroom exists
      const classroom = await this.classroomModel.findById(classroom_id);
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user is a member of the classroom
      const userAccess = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(classroom_id),
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted'
      });

      if (!userAccess) {
        throw new BadRequestException('User not a member of the classroom');
      }

      // Check if child-only classroom and user is student
      if (classroom.child_only && userAccess.role === 'student') {
        throw new BadRequestException('Only teachers can post in this classroom');
      }

      // Get all classroom members
      const allMembers = await this.classroomAccessModel.find({
        class_id: new Types.ObjectId(classroom_id),
        status: 'accepted'
      });

      const allMembersIds = allMembers.map(member => member.user_id.toString());

      // Validate audience
      if (audience[0] !== '*') {
        const validAudience = audience.every((aud: string) => allMembersIds.includes(aud));
        if (!validAudience) {
          throw new BadRequestException('Invalid audience');
        }
      }

      // Sanitize content
      const window = new JSDOM('').window;
      const purify = DOMPurify(window);
      const cleanContent = purify.sanitize(content);

      // Create post
      await this.classroomPostModel.create({
        classroom_id: new Types.ObjectId(classroom_id),
        user_id: new Types.ObjectId(user.user_id),
        audience,
        type,
        content: cleanContent,
        files,
        status,
        published_at: published_at ? new Date(published_at) : new Date()
      });

      await this.pubSubService.publish('post.updated', {
        cid: classroom_id,
      });

      return {
        status: 'success',
        message: 'Post created successfully'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not create post');
    }
  }

  async deleteFile(deleteFileDto: DeleteFileDto, user: JwtPayload): Promise<{ status: string, message: string }> {
    try {
      // check if user is classroom owner or teacher
      const access = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(deleteFileDto.classroom_id),
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to delete files in this classroom');
      }

      // delete file
      await this.fileService.deleteFile(deleteFileDto.files[0]);

      return { status: 'success', message: 'File deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not delete file');
    }
  }

  async addComment(addCommentDto: AddCommentDto, user: JwtPayload): Promise<{ status: string; message: string }> {
    try {
      if (!addCommentDto.content) {
        throw new BadRequestException('Comment content is required');
      }

      // Check if classroom exists
      const classroom = await this.classroomModel.findById(addCommentDto.class_id);
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user is a member of the classroom
      const access = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(addCommentDto.class_id),
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted'
      });

      if (!access) {
        throw new UnauthorizedException('You are not a member of this classroom');
      }

      // If child-only classroom, check if user is a student
      if (classroom.child_only && access.role === 'student') {
        throw new UnauthorizedException('Students cannot comment in this classroom');
      }

      // Check if post exists and get its details
      const post = await this.classroomPostModel.findOne({
        _id: new Types.ObjectId(addCommentDto.post_id),
        classroom_id: new Types.ObjectId(addCommentDto.class_id)
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check post type
      if (post.type === 'announcement') {
        throw new BadRequestException('Cannot comment on announcements');
      }

      // Check audience permissions
      let canComment = false;
      if (post.audience[0] === '*' || access.role === 'teacher' || access.role === 'owner') {
        canComment = true;
      } else if (post.audience.includes(user.user_id)) {
        canComment = true;
      }

      if (!canComment) {
        throw new UnauthorizedException('You do not have permission to comment on this post');
      }

      // Create comment
      await this.classroomPostCommentModel.create({
        class_id: new Types.ObjectId(addCommentDto.class_id),
        post_id: new Types.ObjectId(addCommentDto.post_id),
        user_id: new Types.ObjectId(user.user_id),
        content: addCommentDto.content
      });

      // Add notification for post author if different from commenter
      if (post.user_id.toString() !== user.user_id) {
        const userData = await this.userModel.findById(user.user_id);
        await this.notificationModel.create({
          user_id: post.user_id,
          image: process.env.NOTIFICATION_COMMENT_CLASSROOM_IMAGE_URL,
          content: `${userData?.name} commented on your post in ${classroom.name}`,
          link: `/classroom/${addCommentDto.class_id}/#${addCommentDto.post_id}`,
          is_read: false
        });
      }

      await this.pubSubService.publish('post.updated', {
        cid: addCommentDto.class_id,
        pid: addCommentDto.post_id,
      });

      return {
        status: 'success',
        message: 'Comment added successfully'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not add comment');
    }
  }

  async deleteComment(commentId: string, user: JwtPayload): Promise<any> {
    try {
      const comment = await this.classroomPostCommentModel.findById(commentId);
      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      // Check if user owns the comment or has teacher/owner role
      const access = await this.classroomAccessModel.findOne({
        class_id: comment.class_id,
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted'
      });

      if (!access || (access.role === 'student' && comment.user_id.toString() !== user.user_id)) {
        throw new UnauthorizedException('You do not have permission to delete this comment');
      }

      const result = await this.classroomPostCommentModel.findByIdAndDelete(commentId);
      if (!result) {
        throw new InternalServerErrorException('Failed to delete comment');
      }

      await this.pubSubService.publish('post.updated', {
        cid: comment.class_id.toString(),
        pid: comment.post_id.toString(),
      });

      return {
        status: 'success',
        message: 'Comment deleted successfully',
        data: {
          id: commentId
        }
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not delete comment');
    }
  }

  async deletePost(postId: string, user: JwtPayload): Promise<any> {
    try {
      const post = await this.classroomPostModel.findById(postId);
      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check if user owns the post or has teacher/owner role
      const access = await this.classroomAccessModel.findOne({
        class_id: post.classroom_id,
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted'
      });

      if (!access || (access.role === 'student' && post.user_id.toString() !== user.user_id)) {
        throw new UnauthorizedException('You do not have permission to delete this post');
      }

      // Delete all comments first
      await this.classroomPostCommentModel.deleteMany({ post_id: new Types.ObjectId(postId) });

      // Delete the post
      const result = await this.classroomPostModel.findByIdAndDelete(postId);
      if (!result) {
        throw new InternalServerErrorException('Failed to delete post');
      }

      await this.pubSubService.publish('post.updated', {
        cid: post.classroom_id.toString(),
        pid: postId,
      });

      return {
        status: 'success',
        message: 'Post deleted successfully',
        data: {
          id: postId
        }
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not delete post');
    }
  }

  async getClassroomPosts(cid: string, user: JwtPayload) {
    try {
      // Check if classroom exists
      const classroom = await this.classroomModel.findById(cid);
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user has access to the classroom
      const access = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(cid),
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted'
      });

      if (!access) {
        throw new UnauthorizedException('You do not have access to this classroom');
      }

      // Get posts with user info and latest comment
      const posts = await this.classroomPostModel.aggregate([
        {
          $match: {
            classroom_id: new Types.ObjectId(cid)
          }
        },
        {
          $sort: {
            created_at: -1
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $lookup: {
            from: 'classroom_post_comments',
            let: { postId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$post_id', '$$postId'] }
                }
              },
              {
                $sort: { created_at: -1 }
              },
              {
                $limit: 1
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'user_id',
                  foreignField: '_id',
                  as: 'user'
                }
              },
              {
                $unwind: '$user'
              },
              {
                $project: {
                  id: '$_id',
                  content: 1,
                  created_at: 1,
                  'user.id': '$user._id',
                  'user.name': 1,
                  'user.avatar': 1,
                  'user.email': 1
                }
              }
            ],
            as: 'comments'
          }
        },
        {
          $lookup: {
            from: 'classroom_post_comments',
            let: { postId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$post_id', '$$postId'] }
                }
              },
              {
                $count: 'count'
              }
            ],
            as: 'comments_aggregate'
          }
        },
        {
          $project: {
            id: '$_id',
            type: 1,
            files: 1,
            status: 1,
            content: 1,
            audience: 1,
            created_at: 1,
            'user.id': '$user._id',
            'user.name': 1,
            'user.avatar': 1,
            comments: 1,
            'comments_count': { 
              $ifNull: [{ $arrayElemAt: ['$comments_aggregate.count', 0] }, 0] 
            }
          }
        }
      ]);

      return {
        status: 'success',
        message: 'Classroom posts retrieved successfully',
        data: posts
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not retrieve classroom posts');
    }
  }

  async getPostComments(pid: string, user: JwtPayload): Promise<{ status: string; message: string; data: any[] }> {
    try {
      // Check if post exists and get classroom id
      const post = await this.classroomPostModel.findById(pid);
      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check if user has access to the classroom
      const access = await this.classroomAccessModel.findOne({
        class_id: post.classroom_id,
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted'
      });

      if (!access) {
        throw new UnauthorizedException('You do not have access to this classroom');
      }

      // Get comments with user info
      const comments = await this.classroomPostCommentModel.aggregate([
        {
          $match: {
            post_id: new Types.ObjectId(pid)
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            id: '$_id',
            content: 1,
            created_at: 1,
            'user.id': '$user._id',
            'user.name': 1,
            'user.email': 1,
            'user.avatar': 1
          }
        }
      ]);

      return {
        status: 'success',
        message: 'Post comments retrieved successfully',
        data: comments
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not retrieve post comments');
    }
  }
} 