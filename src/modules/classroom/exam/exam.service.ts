import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtPayload } from '../../../common/decorators/user.decorator';
import { Exam } from './schemas/exam.schema';
import { ExamSubmission } from './schemas/exam-submission.schema';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { CreateExamSubmissionDto } from './dto/create-exam-submission.dto';
import { UpdateExamSubmissionDto } from './dto/update-exam-submission.dto';
import { UpdateExamSubmissionMarkingsDto } from './dto/update-exam-submission-markings.dto';
import { DeleteFileDto } from './dto/delete-file.dto';
import { User } from '../../../modules/auth/schemas/user.schema';
import { PubSubService } from '../../../shared/services/pubsub.service';
import { FileService } from '../../../shared/services/file.service';

@Injectable()
export class ExamService {
  constructor(
    @InjectModel(Exam.name) private examModel: Model<Exam>,
    @InjectModel(ExamSubmission.name) private examSubmissionModel: Model<ExamSubmission>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Classroom.name) private classroomModel: Model<Classroom>,
    @InjectModel(ClassroomAccess.name) private classroomAccessModel: Model<ClassroomAccess>,
    private readonly pubSubService: PubSubService,
    private fileService: FileService
  ) {}

  async createExam(createExamDto: CreateExamDto, user: JwtPayload): Promise<any> {
    const classroom = await this.classroomModel.findById(createExamDto.class_id);
    if (!classroom) {
      throw new NotFoundException('Classroom not found');
    }

    const access = await this.classroomAccessModel.findOne({
      class_id: new Types.ObjectId(createExamDto.class_id),
      user_id: new Types.ObjectId(user.user_id),
      status: 'accepted'
    });

    if (!access || (access.role !== 'owner' && access.role !== 'teacher')) {
      throw new UnauthorizedException('You do not have permission to create exams in this classroom');
    }

    const exam = new this.examModel({
      ...createExamDto,
      start_once: createExamDto.start_once ? new Date(createExamDto.start_once) : null,
      duration: createExamDto.duration ? parseInt(createExamDto.duration) : 0,
      class_id: new Types.ObjectId(createExamDto.class_id),
      owner_id: new Types.ObjectId(user.user_id)
    });

    const createdExam = await exam.save();

    // publish event
    await this.pubSubService.publish('exam.updated', {
      cid: createExamDto.class_id,
    })

    return {
      status: 'success',
      message: 'Exam created successfully',
      data: createdExam
    }

  }

  async updateExam(updateExamDto: UpdateExamDto, user: JwtPayload): Promise<any> {
    const exam = await this.examModel.findById(updateExamDto.id);
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const access = await this.classroomAccessModel.findOne({
      class_id: exam.class_id,
      user_id: new Types.ObjectId(user.user_id),
      status: 'accepted'
    });

    if (!access || (access.role !== 'owner' && access.role !== 'teacher')) {
      throw new UnauthorizedException('You do not have permission to update this exam');
    }

    const updatedExam = await this.examModel.findByIdAndUpdate(
      updateExamDto.id,
      {
        title: updateExamDto.title,
        content: updateExamDto.content,
        audience: updateExamDto.audience,
        questions: updateExamDto.questions,
        duration: updateExamDto.duration ? parseInt(updateExamDto.duration) : 0,
        start_once: updateExamDto.start_once ? new Date(updateExamDto.start_once) : null,
        status: updateExamDto.status
      },
      { new: true }
    );

    if (!updatedExam) {
      throw new InternalServerErrorException('Failed to update exam');
    }

    // publish event
    await this.pubSubService.publish('exam.updated', {
      cid: exam.class_id.toString(),
      eid: updateExamDto.id
    })

    return {
      status: 'success',
      message: 'Exam updated successfully',
      data: updatedExam
    }
  }

  async deleteExam(examId: string, user: JwtPayload): Promise<boolean> {
    const exam = await this.examModel.findById(examId);
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const access = await this.classroomAccessModel.findOne({
      class_id: exam.class_id,
      user_id: new Types.ObjectId(user.user_id),
      status: 'accepted'
    });

    if (!access || (access.role !== 'owner' && access.role !== 'teacher')) {
      throw new UnauthorizedException('You do not have permission to delete this exam');
    }

    const result = await this.examModel.findByIdAndDelete(examId);
    if (!result) {
      throw new InternalServerErrorException('Failed to delete exam');
    }

    // publish event
    await this.pubSubService.publish('exam.updated', {
      cid: exam.class_id.toString(),
    })

    return true;
  }

  async deleteFile(deleteFileDto: DeleteFileDto, user: JwtPayload): Promise<{ status: string, message: string }> {
    try {
      // check if user is owner of this exam submission
      const submission = await this.examSubmissionModel.findById(deleteFileDto.exam_submission_id);
      if (!submission) {
        throw new NotFoundException('Exam submission not found');
      }

      if (submission.user_id.toString() !== user.user_id) {
        throw new UnauthorizedException('You do not have permission to delete files in this exam submission');
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

  async getExamSubmission(submissionId: string, user: JwtPayload): Promise<any> {
    try {
      const submission = await this.examSubmissionModel.findById(submissionId).select({
        _id: 0,
        id: '$_id',
        status: 1,
        user_id: 1,
        exam_id: 1,
        answers: 1,
        markings: 1,
        created_at: 1,
        updated_at: 1
      });
      if (!submission) {
        return null;
      }

      // Get the exam to check classroom access
      const exam = await this.examModel.findById(submission.exam_id);
      if (!exam) {
        throw new NotFoundException('Associated exam not found');
      }

      // Check if user has access to view this submission
      const access = await this.classroomAccessModel.findOne({
        class_id: exam.class_id,
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted'
      });

      if (!access) {
        throw new UnauthorizedException('You do not have access to view this submission');
      }

      // If user is a student, they can only view their own submissions
      if (access.role === 'student' && submission.user_id.toString() !== user.user_id) {
        throw new UnauthorizedException('You can only view your own submissions');
      }

      return {
        status: 'success',
        message: 'Exam submission retrieved successfully',
        data: submission
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not get exam submission');
    }
  }

  async createExamSubmission(createExamSubmissionDto: CreateExamSubmissionDto, user: JwtPayload): Promise<ExamSubmission> {
    const exam = await this.examModel.findById(createExamSubmissionDto.exam_id);
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (exam.status !== 'published') {
      throw new BadRequestException('Cannot submit to an unpublished exam');
    }

    const access = await this.classroomAccessModel.findOne({
      class_id: exam.class_id,
      user_id: new Types.ObjectId(user.user_id),
      status: 'accepted'
    });

    if (!access) {
      throw new UnauthorizedException('You do not have access to this exam');
    }

    const existingSubmission = await this.examSubmissionModel.findOne({
      exam_id: new Types.ObjectId(createExamSubmissionDto.exam_id),
      user_id: new Types.ObjectId(user.user_id)
    });

    if (existingSubmission) {
      throw new BadRequestException('You already have a submission for this exam');
    }

    const submission = new this.examSubmissionModel({
      exam_id: new Types.ObjectId(createExamSubmissionDto.exam_id),
      user_id: new Types.ObjectId(user.user_id),
      status: createExamSubmissionDto.status
    });

    return await submission.save();
  }

  async updateExamSubmission(updateExamSubmissionDto: UpdateExamSubmissionDto, user: JwtPayload): Promise<ExamSubmission> {
    const submission = await this.examSubmissionModel.findById(updateExamSubmissionDto.id);
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const exam = await this.examModel.findById(submission.exam_id);
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const access = await this.classroomAccessModel.findOne({
      class_id: new Types.ObjectId(exam.class_id),
      user_id: new Types.ObjectId(user.user_id),
      status: 'accepted'
    });

    if (!access) {
      throw new UnauthorizedException('You do not have access to this exam');
    }

    if (submission.user_id.toString() !== user.user_id) {
      throw new UnauthorizedException('You can only update your own answers');
    }

    const updatedSubmission = await this.examSubmissionModel.findByIdAndUpdate(
      updateExamSubmissionDto.id,
      {
        answers: updateExamSubmissionDto.answers,
        status: updateExamSubmissionDto.status
      },
      { new: true }
    );

    if (!updatedSubmission) {
      throw new InternalServerErrorException('Failed to update submission');
    }

    // publish event
    if (updateExamSubmissionDto.status === 'submitted') {
      await this.pubSubService.publish('exam.updated', {
        cid: exam.class_id.toString(),
        eid: exam.id
      })
    }

    return updatedSubmission;
  }

  async updateExamSubmissionMarkings(updateMarkingsDto: UpdateExamSubmissionMarkingsDto, user: JwtPayload): Promise<any> {
    const submission = await this.examSubmissionModel.findById(updateMarkingsDto.id);
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const exam = await this.examModel.findById(submission.exam_id);
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const access = await this.classroomAccessModel.findOne({
      class_id: new Types.ObjectId(exam.class_id),
      user_id: new Types.ObjectId(user.user_id),
      status: 'accepted'
    });

    if (!access || (access.role !== 'owner' && access.role !== 'teacher')) {
      throw new UnauthorizedException('Only teachers can update markings');
    }

    const updatedSubmission = await this.examSubmissionModel.findByIdAndUpdate(
      updateMarkingsDto.id,
      {
        markings: updateMarkingsDto.markings,
        status: updateMarkingsDto.status
      },
      { new: true }
    );

    if (!updatedSubmission) {
      throw new InternalServerErrorException('Failed to update submission markings');
    }

    return {
      status: 'success',
      message: 'Submission markings updated successfully',
      data: updatedSubmission
    };
  }

  async listExams(classId: string, user: JwtPayload) {
    try {
      const access = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(classId),
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to view the exams');
      }

      const result = await this.examModel.aggregate([
        {
          $match: {
            class_id: new Types.ObjectId(classId)
          }
        },
        {
          $sort: { created_at: -1 }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'owner_id',
            foreignField: '_id',
            as: 'creator'
          }
        },
        {
          $unwind: '$creator'
        },
        {
          $project: {
            _id: 0,
            id: '$_id',
            status: '$status',
            title: '$title',
            audience: '$audience',
            duration: '$duration',
            owner_id: '$owner_id',
            start_once: '$start_once',
            owner: {
              id: '$creator._id',
              name: '$creator.name',
              avatar: '$creator.avatar',
              email: '$creator.email'
            },
            created_at: '$created_at',
            updated_at: '$updated_at'
          }
        }
      ])

      return {
        status: 'success',
        message: 'Exams retrieved successfully',
        data: result
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not retrieve exams');
    }
  }

  async getExam(id: string, user: JwtPayload): Promise<any> {
    try {
      const exam = await this.examModel.findById(new Types.ObjectId(id));
      
      if (!exam) {
        throw new NotFoundException('Exam not found');
      }

      // Check if user has access to the classroom
      const access = await this.classroomAccessModel.findOne({
        class_id: exam.class_id,
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to view this exam');
      }

      // Get exam with owner using aggregation
      const result = await this.examModel.aggregate([
        {
          $match: {
            _id: new Types.ObjectId(id)
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'owner_id',
            foreignField: '_id',
            as: 'creator'
          }
        },
        {
          $unwind: '$creator'
        },
        {
          $project: {
            _id: 0,
            id: '$_id',
            status: '$status',
            title: '$title',
            content: '$content',
            audience: '$audience',
            questions: '$questions',
            duration: '$duration',
            start_once: '$start_once',
            owner_id: '$owner_id',
            owner: {
              id: '$creator._id',
              name: '$creator.name',
              avatar: '$creator.avatar',
              email: '$creator.email'
            },
            created_at: '$created_at',
            updated_at: '$updated_at'
          }
        }
      ])

      if (!result.length) {
        throw new NotFoundException('exam not found');
      }

      return {
        status: 'success',
        message: 'exam retrieved successfully',
        data: result[0]
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not retrieve exam');
    }
  }

  async listExamSubmissions(examId: string, user: JwtPayload): Promise<{ status: string; message: string; data: any[] }> {
    try {
      const exam = await this.examModel.findById(examId);
      if (!exam) {
        throw new NotFoundException('Exam not found');
      }

      // Check if user has access to view submissions
      const access = await this.classroomAccessModel.findOne({
        class_id: exam.class_id,
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to view submissions');
      }

      const result = await this.examSubmissionModel.aggregate([
        {
          $match: {
            exam_id: new Types.ObjectId(examId)
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'submitter'
          }
        },
        {
          $unwind: '$submitter'
        },
        {
          $project: {
            _id: 0,
            id: '$_id',
            status: '$status',
            user_id: '$user_id',
            exam_id: '$exam_id',
            answers: '$answers',
            markings: '$markings',
            created_at: '$created_at',
            updated_at: '$updated_at',
            user: {
              id: '$submitter._id',
              name: '$submitter.name',
              email: '$submitter.email',
              avatar: '$submitter.avatar'
            }
          }
        }
      ]);

      return {
        status: 'success',
        message: 'Exam submissions retrieved successfully',
        data: result
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not retrieve exam submissions');
    }
  }

  async getMySubmissions(examId: string, userId: string, user: JwtPayload): Promise<{ status: string; message: string; data: any[] }> {
    try {
      const exam = await this.examModel.findById(examId);
      if (!exam) {
        throw new NotFoundException('Exam not found');
      }

      // check if user requests his own submissions
      if (userId !== user.user_id) {
        throw new UnauthorizedException('You do not have permission to view this exam submissions');
      }

      // Check if user has access to the classroom
      const access = await this.classroomAccessModel.findOne({
        class_id: exam.class_id,
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted'
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to view this exam');
      }

      const mySubmissions = await this.examSubmissionModel.find({
        exam_id: new Types.ObjectId(examId),
        user_id: new Types.ObjectId(userId)
      }).select({
        _id: 0,
        id: '$_id',
        status: 1,
        user_id: 1,
        exam_id: 1,
        answers: 1,
        markings: 1,
        created_at: 1,
        updated_at: 1
      }).lean();

      return {
        status: 'success',
        message: 'Your exam submissions retrieved successfully',
        data: mySubmissions
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not retrieve your exam submissions');
    }
  }
} 