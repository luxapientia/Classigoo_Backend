import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtPayload } from '../../../common/decorators/user.decorator';
import { Assignment } from './schemas/assignment.schema';
import { AssignmentSubmission } from './schemas/assignment-submission.schema';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { CreateAssignmentSubmissionDto } from './dto/create-assignment-submission.dto';
import { UpdateAssignmentSubmissionDto } from './dto/update-assignment-submission.dto';
import { DeleteFileDto } from './dto/delete-file.dto';
import { FileService } from '../../../shared/services/file.service';
import { PubSubService } from 'src/shared/services/pubsub.service';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectModel(Assignment.name) private assignmentModel: Model<Assignment>,
    @InjectModel(AssignmentSubmission.name) private assignmentSubmissionModel: Model<AssignmentSubmission>,
    @InjectModel(Classroom.name) private classroomModel: Model<Classroom>,
    @InjectModel(ClassroomAccess.name) private classroomAccessModel: Model<ClassroomAccess>,
    private fileService: FileService,
    private pubSubService: PubSubService
  ) {}

  async createAssignment(createAssignmentDto: CreateAssignmentDto, user: JwtPayload): Promise<any> {
    try {
      // Check if user has permission to create assignment in this classroom
      const access = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(createAssignmentDto.class_id),
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
        role: { $in: ['owner', 'teacher'] }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to create assignments in this classroom');
      }

      const assignment = new this.assignmentModel({
        ...createAssignmentDto,
        deadline: new Date(createAssignmentDto.deadline),
        creator_id: new Types.ObjectId(user.user_id),
        class_id: new Types.ObjectId(createAssignmentDto.class_id)
      });

      const createdAssignment = await assignment.save();

      // publish event
      await this.pubSubService.publish('assignment.updated', {
        cid: createAssignmentDto.class_id,
      })

      return {
        status: 'success',
        message: 'Assignment created successfully',
        data: createdAssignment
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not create assignment');
    }
  }

  async updateAssignment(updateAssignmentDto: UpdateAssignmentDto, user: JwtPayload): Promise<any> {
    try {
      const assignment = await this.assignmentModel.findById(updateAssignmentDto.id);
      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      // Check if user has permission to update this assignment
      const access = await this.classroomAccessModel.findOne({
        class_id: assignment.class_id,
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
        role: { $in: ['owner', 'teacher'] }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to update this assignment');
      }

      const { id, ...updateData } = updateAssignmentDto;
      const updatedAssignment = await this.assignmentModel.findByIdAndUpdate(id, { ...updateData, deadline: new Date(updateAssignmentDto.deadline), }, { new: true });
      if (!updatedAssignment) {
        throw new InternalServerErrorException('Failed to update assignment');
      }

      // publish event
      await this.pubSubService.publish('assignment.updated', {
        cid: assignment.class_id.toString(),
        aid: updateAssignmentDto.id
      })
      
      return {
        status: 'success',
        message: 'Assignment updated successfully',
        data: updatedAssignment
      }
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not update assignment');
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

  async deleteAssignment(assignmentId: string, user: JwtPayload): Promise<{ status: string, message: string }> {
    try {
      const assignment = await this.assignmentModel.findById(assignmentId);
      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      // Check if user has permission to delete this assignment
      const access = await this.classroomAccessModel.findOne({
        class_id: assignment.class_id,
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
        role: { $in: ['owner', 'teacher'] }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to delete this assignment');
      }

      const result = await this.assignmentModel.findByIdAndDelete(assignmentId);
      if (!result) {
        throw new InternalServerErrorException('Failed to delete assignment');
      }

      // publish event
      await this.pubSubService.publish('assignment.updated', {
        cid: assignment.class_id.toString(),
        aid: assignmentId
      })

      return {
        status: 'success',
        message: 'Assignment deleted succesfully'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not delete assignment');
    }
  }

  async getAssignmentSubmission(submissionId: string, user: JwtPayload): Promise<AssignmentSubmission | null> {
    try {
      const submission = await this.assignmentSubmissionModel.findById(submissionId);
      if (!submission) {
        return null;
      }

      // Get the assignment to check classroom access
      const assignment = await this.assignmentModel.findById(submission.assignment_id);
      if (!assignment) {
        throw new NotFoundException('Associated assignment not found');
      }

      // Check if user has access to view this submission
      const access = await this.classroomAccessModel.findOne({
        class_id: assignment.class_id,
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

      return submission;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not get assignment submission');
    }
  }

  async createAssignmentSubmission(createAssignmentSubmissionDto: CreateAssignmentSubmissionDto, user: JwtPayload): Promise<AssignmentSubmission> {
    try {
      const assignment = await this.assignmentModel.findById(createAssignmentSubmissionDto.assignment_id);
      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      // Check if assignment is published
      if (assignment.status !== 'published') {
        throw new BadRequestException('Cannot submit to an unpublished assignment');
      }

      // Check if user is a member of the classroom
      const access = await this.classroomAccessModel.findOne({
        class_id: assignment.class_id,
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
        role: 'student'
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to submit to this assignment');
      }

      // Check if user already has a submission
      const existingSubmission = await this.assignmentSubmissionModel.findOne({
        assignment_id: new Types.ObjectId(createAssignmentSubmissionDto.assignment_id),
        user_id: new Types.ObjectId(user.user_id)
      });

      if (existingSubmission) {
        throw new BadRequestException('You have already submitted to this assignment');
      }

      const submission = new this.assignmentSubmissionModel({
        ...createAssignmentSubmissionDto,
        user_id: new Types.ObjectId(user.user_id),
        assignment_id: new Types.ObjectId(createAssignmentSubmissionDto.assignment_id)
      });

      // publish event
      await this.pubSubService.publish('assignment.updated', {
        aid: createAssignmentSubmissionDto.assignment_id,
        cid: assignment.class_id.toString()
      })

      return await submission.save();
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not create submission');
    }
  }

  async updateAssignmentSubmission(updateAssignmentSubmissionDto: UpdateAssignmentSubmissionDto, user: JwtPayload): Promise<AssignmentSubmission> {
    try {
      const submission = await this.assignmentSubmissionModel.findById(updateAssignmentSubmissionDto.id);
      if (!submission) {
        throw new NotFoundException('Submission not found');
      }

      // Check if user owns this submission
      if (submission.user_id.toString() !== user.user_id) {
        throw new UnauthorizedException('You do not have permission to update this submission');
      }

      // Get the assignment id of the updated submission


      const { id, ...updateData } = updateAssignmentSubmissionDto;
      const updatedSubmission = await this.assignmentSubmissionModel.findByIdAndUpdate(id, updateData, { new: true });
      if (!updatedSubmission) {
        throw new InternalServerErrorException('Failed to update submission');
      }

      // publish event
      await this.pubSubService.publish('assignment.updated', {
        aid: submission.assignment_id.toString(),
      })

      return updatedSubmission;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not update submission');
    }
  }

  async listAssignments(classId: string, user: JwtPayload): Promise<any> {
    try {
      const access = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(classId),
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to view the assignments');
      }

      const result = await this.assignmentModel.aggregate([
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
            localField: 'creator_id',
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
            deadline: '$deadline',
            audience: '$audience',
            creator_id: '$creator_id',
            owner: {
              id: '$creator._id',
              name: '$creator.name',
              avatar: '$creator.avatar',
              email: '$creator.email'
            },
            updated_at: '$updated_at'
          }
        }
      ])

      return {
        status: 'success',
        message: 'Assignments retrieved successfully',
        data: result
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not retrieve assignments');
    }
  }

  async getAssignment(id: string, user: JwtPayload): Promise<any> {
    try {
      const assignment = await this.assignmentModel.findById(new Types.ObjectId(id));
      
      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      // Check if user has access to the classroom
      const access = await this.classroomAccessModel.findOne({
        class_id: assignment.class_id,
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to view this assignment');
      }

      // Get assignment with owner and submissions using aggregation
      const result = await this.assignmentModel.aggregate([
        {
          $match: {
            _id: new Types.ObjectId(id)
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'creator_id',
            foreignField: '_id',
            as: 'owner'
          }
        },
        {
          $unwind: '$owner'
        },
        {
          $lookup: {
            from: 'assignment_submissions',
            localField: '_id',
            foreignField: 'assignment_id',
            as: 'assignment_submissions'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'assignment_submissions.user_id',
            foreignField: '_id',
            as: 'submitters'
          }
        },
        {
          $project: {
            _id: 0,
            id: '$_id',
            title: 1,
            files: 1,
            status: 1,
            content: 1,
            deadline: 1,
            audience: 1,
            class_id: 1,
            creator_id: 1,
            created_at: 1,
            updated_at: 1,
            owner: {
              id: '$owner._id',
              name: '$owner.name',
              email: '$owner.email',
              avatar: '$owner.avatar'
            },
            assignment_submissions: {
              $map: {
                input: '$assignment_submissions',
                as: 'submission',
                in: {
                  id: '$$submission._id',
                  files: '$$submission.files',
                  status: '$$submission.status',
                  created_at: '$$submission.created_at',
                  updated_at: '$$submission.updated_at',
                  submitter: {
                    $arrayElemAt: [
                      {
                        $map: {
                          input: {
                            $filter: {
                              input: '$submitters',
                              as: 'submitter',
                              cond: { $eq: ['$$submitter._id', '$$submission.user_id'] }
                            }
                          },
                          as: 'submitter',
                          in: {
                            id: '$$submitter._id',
                            name: '$$submitter.name',
                            email: '$$submitter.email',
                            avatar: '$$submitter.avatar'
                          }
                        }
                      },
                      0
                    ]
                  }
                }
              }
            }
          }
        }
      ]);

      if (!result.length) {
        throw new NotFoundException('Assignment not found');
      }

      return {
        status: 'success',
        message: 'Assignment retrieved successfully',
        data: result[0]
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not retrieve assignment');
    }
  }
} 