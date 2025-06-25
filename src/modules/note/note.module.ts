import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NoteController } from './note.controller';
import { NoteService } from './note.service';
import { Note, NoteSchema } from './schemas/note.schema';
import { ClassroomNote, ClassroomNoteSchema } from './schemas/classroom-note.schema';
import { Classroom, ClassroomSchema } from '../classroom/core/schemas/classroom.schema';
import { ClassroomAccess, ClassroomAccessSchema } from '../classroom/core/schemas/classroom-access.schema';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Note.name, schema: NoteSchema },
      { name: ClassroomNote.name, schema: ClassroomNoteSchema },
      { name: Classroom.name, schema: ClassroomSchema },
      { name: ClassroomAccess.name, schema: ClassroomAccessSchema }
    ]),
    SharedModule
  ],
  controllers: [NoteController],
  providers: [NoteService],
  exports: [NoteService]
})
export class NoteModule {} 