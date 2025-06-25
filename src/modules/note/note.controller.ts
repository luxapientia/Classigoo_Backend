import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { NoteService } from './note.service';
import { UserGuard } from '../../shared/guards/user.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/user.decorator';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Controller('v1/note')
@UseGuards(UserGuard)
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Get('list/:userId')
  async getNotes(@Param('userId') userId: string, @CurrentUser() user: JwtPayload) {
    return this.noteService.getNotes(userId, user);
  }

  @Get(':id')
  async getNoteById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.noteService.getNoteById(id, user);
  }

  @Post('create')
  async createNote(
    @Body() createNoteDto: CreateNoteDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.noteService.createNote(createNoteDto, user);
  }

  @Post('update')
  async updateNote(
    @Body() updateNoteDto: UpdateNoteDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.noteService.updateNote(updateNoteDto, user);
  }

  @Delete(':id')
  async deleteNote(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.noteService.deleteNote(id, user);
  }
} 