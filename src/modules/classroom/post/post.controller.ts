import { Controller, Post, Delete, Body, Param, UseGuards, UseInterceptors, Req, Get, BadRequestException } from '@nestjs/common';
import { PostService } from './post.service';
import { UserGuard } from '../../../shared/guards/user.guard';
import { FileInterceptor } from '../../../shared/interceptors/file.interceptor';
import { CurrentUser, JwtPayload } from '../../../common/decorators/user.decorator';
import { CreateClassroomPostDto } from './dto/create-classroom-post.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { RequestWithFiles } from '../common/interfaces/response.interface';
import { DeleteFileDto } from './dto/delete-file.dto';

@Controller('v1/classroom/post')
@UseGuards(UserGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post('create')
  async createPost(
    @Body() createPostDto: CreateClassroomPostDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.postService.createPost(createPostDto, user);
  }

  @Post('file/upload')
  @UseInterceptors(FileInterceptor)
  uploadFile(@Req() request: RequestWithFiles) {
    
    if (!request.processedFiles || request.processedFiles.length === 0) {
      throw new BadRequestException('No file uploaded');
    }

    return {
      status: 'success',
      message: 'File uploaded successfully',
      data: {
        bucketKey: request.processedFiles?.at(0)?.key,
        location: request.processedFiles?.at(0)?.signedUrl,
        name: request.processedFiles?.at(0)?.originalName,
        type: request.processedFiles?.at(0)?.mimeType
      }
    }
  }

  @Post('file/delete')
  @UseGuards(UserGuard)
  async deleteFile(
    @Body() deleteFileDto: DeleteFileDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.postService.deleteFile(deleteFileDto, user);
  }

  @Post('comment/add')
  async addComment(
    @Body() addCommentDto: AddCommentDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.postService.addComment(addCommentDto, user);
  }

  @Delete('comment/:id')
  async deleteComment(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return this.postService.deleteComment(id, user);
  }

  @Delete(':id')
  async deletePost(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return this.postService.deletePost(id, user);
  }

  @Get('list/:cid')
  async getClassroomPosts(
    @Param('cid') cid: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ status: string; message: string; data: any[] }> {
    return this.postService.getClassroomPosts(cid, user);
  }

  @Get('comments/:pid')
  async getPostComments(
    @Param('pid') pid: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ status: string; message: string; data: any[] }> {
    return this.postService.getPostComments(pid, user);
  }
} 