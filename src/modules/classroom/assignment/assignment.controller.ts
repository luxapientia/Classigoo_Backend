import { Controller, Get, Post, Delete, Body, Param, UseGuards, UseInterceptors, Req, BadRequestException } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { UserGuard } from '../../../shared/guards/user.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/user.decorator';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { CreateAssignmentSubmissionDto } from './dto/create-assignment-submission.dto';
import { UpdateAssignmentSubmissionDto } from './dto/update-assignment-submission.dto';
import { FileInterceptor } from '../../../shared/interceptors/file.interceptor';
import { RequestWithFiles } from '../common/interfaces/response.interface';
import { DeleteFileDto } from './dto/delete-file.dto';

@Controller('v1/classroom/assignment')
@UseGuards(UserGuard)
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post('create')
  async createAssignment(
    @Body() createAssignmentDto: CreateAssignmentDto,
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return this.assignmentService.createAssignment(createAssignmentDto, user);
  }

  @Post('update')
  async updateAssignment(
    @Body() updateAssignmentDto: UpdateAssignmentDto,
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return this.assignmentService.updateAssignment(updateAssignmentDto, user);
  }

  @Post('file/upload')
  @UseInterceptors(FileInterceptor)
  uploadFile(
    @Req() request: RequestWithFiles,
  ) {
    // return this.messageService.uploadFile(uploadFileDto, user);

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
    return this.assignmentService.deleteFile(deleteFileDto, user);
  }

  @Delete(':id')
  async deleteAssignment(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.assignmentService.deleteAssignment(id, user);
  }

  @Get('submission/:id')
  async getAssignmentSubmission(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.assignmentService.getAssignmentSubmission(id, user);
  }

  @Post('submission/create')
  async createAssignmentSubmission(
    @Body() createAssignmentSubmissionDto: CreateAssignmentSubmissionDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.assignmentService.createAssignmentSubmission(createAssignmentSubmissionDto, user);
  }

  @Post('submission/update')
  async updateAssignmentSubmission(
    @Body() updateAssignmentSubmissionDto: UpdateAssignmentSubmissionDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.assignmentService.updateAssignmentSubmission(updateAssignmentSubmissionDto, user);
  }

  @Get('list/:classId')
  async listAssignments(
    @CurrentUser() user: JwtPayload,
    @Param('classId') classId: string
  ): Promise<any> {
    return await this.assignmentService.listAssignments(classId, user);
  }

  @Get(':id')
  async getAssignment(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return await this.assignmentService.getAssignment(id, user);
  }
} 