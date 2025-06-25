import { Injectable, NotFoundException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Note } from './schemas/note.schema';
import { ClassroomNote } from './schemas/classroom-note.schema';
import { Classroom } from '../classroom/core/schemas/classroom.schema';
import { ClassroomAccess } from '../classroom/core/schemas/classroom-access.schema';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtPayload } from '../../common/decorators/user.decorator';
import { PubSubService } from '../../shared/services/pubsub.service';

@Injectable()
export class NoteService {
  constructor(
    @InjectModel(Note.name) private noteModel: Model<Note>,
    @InjectModel(ClassroomNote.name) private classroomNoteModel: Model<ClassroomNote>,
    @InjectModel(Classroom.name) private classroomModel: Model<Classroom>,
    @InjectModel(ClassroomAccess.name) private classroomAccessModel: Model<ClassroomAccess>,
    private readonly pubSubService: PubSubService
  ) {}

  async getNotes(userId: string, user: JwtPayload) {
    try {
      if (userId !== user.user_id) {
        throw new UnauthorizedException('You do not have permission to view this notes');
      }

      const notes = await this.noteModel.aggregate([
        {
          $match: {
            owner_id: new Types.ObjectId(userId)
          }
        },
        {
          $project: {
            _id: 0,
            id: '$_id',
            status: 1,
            title: 1,
            updated_at: 1,
          }
        },
        {
          $sort: {
            updated_at: -1
          }
        }
      ])

      return {
        status: 'success',
        message: 'Notes retrieved successfully',
        data: notes
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get notes');
    }
  }

  async getNoteById(id: string, user: JwtPayload) {
    try {
      const note = await this.noteModel.findById(id);

      if (!note) {
        throw new NotFoundException('Note not found');
      }

      if (note.owner_id.toString() !== user.user_id) {
        throw new UnauthorizedException('You do not have permission to view this note');
      }

      const formattedNote = await this.noteModel.aggregate([
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
            as: 'owner_data'
          }
        },
        {
          $unwind: '$owner_data'
        },
        {
          $lookup: {
            from: 'classroom_notes',
            localField: '_id',
            foreignField: 'note_id',
            as: 'class_note'
          }
        },
        {
          $unwind: {
            path: '$class_note',
            preserveNullAndEmptyArrays: true
          },
        },
        {
          $lookup: {
            from: 'classrooms',
            localField: 'class_note.class_id',
            foreignField: '_id',
            as: 'class'
          }
        },
        {
          $unwind: {
            path: '$class',
            preserveNullAndEmptyArrays: true
          },
        },
        {
          $project: {
            status: 1,
            title: 1,
            content: 1,
            updated_at: 1,
            owner_data: {
              id: '$owner_data._id',
              name: '$owner_data.name',
              email: '$owner_data.email',
              avatar: '$owner_data.avatar'
            },
            class_data: {
              id: '$class._id',
              name: '$class.name'
            }
          }
        },
        {
          $group: {
            _id: '$_id',
            status: { $first: '$status' },
            title: { $first: '$title' },
            content: { $first: '$content' },
            updated_at: { $first: '$updated_at' },
            owner_data: { $first: '$owner_data' },
            class_notes: {
              $push: {
                $cond: [
                  { $ifNull: ['$class_data.id', false] }, // Only include if class exists
                  { classroom: '$class_data' },
                  '$$REMOVE'
                ]
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            id: '$_id',
            status: 1,
            title: 1,
            content: 1,
            updated_at: 1,
            owner_data: 1,
            classroom_notes: '$class_notes'
          }
        }
      ])

      return {
        status: 'success',
        message: 'Note retrieved successfully',
        data: formattedNote[0]
      };
    } catch (error) {
      console.log(error);
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get note');
    }
  }

  async createNote(createNoteDto: CreateNoteDto, user: JwtPayload) {
    try {
      const note = new this.noteModel({
        ...createNoteDto,
        owner_id: new Types.ObjectId(user.user_id)
      });

      const savedNote = await note.save();

      // Create classroom associations
      if (createNoteDto.classroom_ids.length > 0) {
        const classroomNotes = createNoteDto.classroom_ids.map(classroomId => ({
          note_id: savedNote._id,
          class_id: new Types.ObjectId(classroomId)
        }));

        await this.classroomNoteModel.insertMany(classroomNotes);
      }

      // Publish event
      // await this.pubSubService.publish('note.created', {
      //   uid: user.user_id
      // });

      return {
        status: 'success',
        message: 'Note created successfully',
        id: savedNote._id?.toString() || ''
      };
    } catch (error) {
      console.log(error);
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create note');
    }
  }

  async updateNote(updateNoteDto: UpdateNoteDto, user: JwtPayload) {
    try {
      const note = await this.noteModel.findById(updateNoteDto.id);
      const validClassroomIds = updateNoteDto.classroom_ids.filter(classroomId => classroomId !== '');

      if (!note) {
        throw new NotFoundException('Note not found');
      }

      if (note.owner_id.toString() !== user.user_id) {
        throw new UnauthorizedException('You do not have permission to update this note');
      }

      const updatedNote = await this.noteModel.findByIdAndUpdate(
        updateNoteDto.id,
        {
          title: updateNoteDto.title,
          content: updateNoteDto.content,
          status: updateNoteDto.status
        },
        { new: true }
      );

      // Update classroom associations
      await this.classroomNoteModel.deleteMany({ note_id: note._id });
      
      if (validClassroomIds.length > 0) {
        const classroomNotes = validClassroomIds.map(classroomId => ({
          note_id: note._id,
          class_id: new Types.ObjectId(classroomId)
        }));

        await this.classroomNoteModel.insertMany(classroomNotes);
      }

      // Publish event
      // await this.pubSubService.publish('note.updated', {
      //   uid: user.user_id
      // });

      return {
        status: 'success',
        message: 'Note updated successfully',
        id: updatedNote?._id?.toString() || ''
      };
    } catch (error) {
      console.log(error);
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update note');
    }
  }

  async deleteNote(id: string, user: JwtPayload) {
    try {
      const note = await this.noteModel.findById(id);

      if (!note) {
        throw new NotFoundException('Note not found');
      }

      if (note.owner_id.toString() !== user.user_id) {
        throw new UnauthorizedException('You do not have permission to delete this note');
      }

      await this.noteModel.findByIdAndDelete(id);
      await this.classroomNoteModel.deleteMany({ note_id: note._id });

      // Publish event
      // await this.pubSubService.publish('note.deleted', {
      //   uid: user.user_id
      // });

      return {
        status: 'success',
        message: 'Note deleted successfully',
        id: note._id?.toString() || ''
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete note');
    }
  }

  async getClassroomNotes(classId: string, user: JwtPayload) {
    try {
      // check if user has access to the classroom
      const classroom = await this.classroomModel.findById(classId);
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }
      
      const classroomAccess = await this.classroomAccessModel.findOne({
        user_id: new Types.ObjectId(user.user_id),
        class_id: new Types.ObjectId(classId),
        status: 'accepted'
      });
      if (!classroomAccess) {
        throw new UnauthorizedException('You do not have permission to view this classroom notes');
      }

      const notes = await this.noteModel.aggregate([
        {
          $lookup: {
            from: 'classroom_notes',
            localField: '_id',
            foreignField: 'note_id',
            as: 'classroom_note'
          }
        },
        {
          $unwind: {
            path: '$classroom_note',
            preserveNullAndEmptyArrays: true
          },
        },
        {
          $match: {
            'classroom_note.class_id': new Types.ObjectId(classId),
            'status': 'published'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'owner_id',
            foreignField: '_id',
            as: 'owner_data'
          }
        },
        {
          $unwind: '$owner_data'
        },
        {
          $project: {
            _id: 0,
            id: '$_id',
            status: 1,
            title: 1,
            updated_at: 1,
            owner_data: {
              name: '$owner_data.name'
            }
          }
        },
        {
          $sort: {
            updated_at: -1
          }
        }
      ]);

      return {
        status: 'success',
        message: 'Classroom notes retrieved successfully',
        data: notes
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get classroom notes');
    }
  }
} 