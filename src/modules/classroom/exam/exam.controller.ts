import { Controller, Get, Post, Delete, Body, Param, UseGuards, UseInterceptors, Req, BadRequestException } from '@nestjs/common';
import { ExamService } from './exam.service';
import { UserGuard } from '../../../shared/guards/user.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/user.decorator';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { CreateExamSubmissionDto } from './dto/create-exam-submission.dto';
import { UpdateExamSubmissionDto } from './dto/update-exam-submission.dto';
import { UpdateExamSubmissionMarkingsDto } from './dto/update-exam-submission-markings.dto';
import { FileInterceptor } from '../../../shared/interceptors/file.interceptor';
import { RequestWithFiles } from '../common/interfaces/response.interface';
import { DeleteFileDto } from './dto/delete-file.dto';

@Controller('v1/classroom/exam')
@UseGuards(UserGuard)
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post('create')
  async createExam(
    @Body() createExamDto: CreateExamDto,
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return this.examService.createExam(createExamDto, user);
  }

  @Post('update')
  async updateExam(
    @Body() updateExamDto: UpdateExamDto,
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return this.examService.updateExam(updateExamDto, user);
  }

  @Delete(':id')
  async deleteExam(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.examService.deleteExam(id, user);
  }

  @Post('submission/image/upload')
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
    return this.examService.deleteFile(deleteFileDto, user);
  }

  @Get('submission/:id')
  async getExamSubmission(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return this.examService.getExamSubmission(id, user);
  }

  @Post('submission/create')
  async createExamSubmission(
    @Body() createExamSubmissionDto: CreateExamSubmissionDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.examService.createExamSubmission(createExamSubmissionDto, user);
  }

  @Post('submission/update')
  async updateExamSubmission(
    @Body() updateExamSubmissionDto: UpdateExamSubmissionDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.examService.updateExamSubmission(updateExamSubmissionDto, user);
  }

  @Post('submission/mark')
  async updateExamSubmissionMarkings(
    @Body() updateMarkingsDto: UpdateExamSubmissionMarkingsDto,
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return this.examService.updateExamSubmissionMarkings(updateMarkingsDto, user);
  }

  @Get('list/:classId')
  async listExams(
    @Param('classId') classId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ status: string; message: string; data: any[] }> {
    return this.examService.listExams(classId, user);
  }

  @Get(':id')
  async getExam(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return await this.examService.getExam(id, user);
  }

  @Get(':id/submissions')
  async listExamSubmissions(
    @Param('id') examId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ status: string; message: string; data: any[] }> {
    return this.examService.listExamSubmissions(examId, user);
  }

  @Get(':exam_id/:user_id/submissions')
  async getMySubmissions(
    @Param('exam_id') examId: string,
    @Param('user_id') userId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ status: string; message: string; data: any[] }> {
    return this.examService.getMySubmissions(examId, userId, user);
  }
} 