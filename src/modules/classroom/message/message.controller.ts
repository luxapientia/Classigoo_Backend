import { Controller, Post, Delete, Body, Param, UseGuards, UseInterceptors, Get, Query, Req, BadRequestException } from '@nestjs/common';
import { MessageService } from './message.service';
import { UserGuard } from '../../../shared/guards/user.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/user.decorator';
import { SendMessageDto } from './dto/send-message.dto';
import { StartChatDto } from './dto/start-chat.dto';
import { ListMessageRecipientsResponse } from './dto/list-message-recipients.dto';
import { MessageResponse } from './dto/get-room-messages.dto';
import { FileInterceptor } from '../../../shared/interceptors/file.interceptor';
import { RequestWithFiles } from '../common/interfaces/response.interface';
import { DeleteFileDto } from './dto/delete-file.dto';

@Controller('v1/classroom/message')
@UseGuards(UserGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('send')
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.messageService.sendMessage(sendMessageDto, user);
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
      }
    }
  }

  @Post('file/delete')
  @UseGuards(UserGuard)
  async deleteFile(
    @Body() deleteFileDto: DeleteFileDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.messageService.deleteFile(deleteFileDto, user);
  }
  

  @Delete(':id')
  async deleteMessage(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.messageService.deleteMessage(id, user);
  }

  @Post('start-chat')
  async startChat(
    @Body() startChatDto: StartChatDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.messageService.startChat(startChatDto, user);
  }

  @Get('recipients/:class_id')
  async listMessageRecipients(
    @CurrentUser() user: JwtPayload,
    @Param('class_id') class_id: string
  ): Promise<ListMessageRecipientsResponse[]> {
    return this.messageService.listMessageRecipients(class_id, user);
  }

  @Get('room/:room_id')
  async getRoomMessages(
    @CurrentUser() user: JwtPayload,
    @Param('room_id') room_id: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0
  ) {
    return this.messageService.getRoomMessages(room_id, limit, offset, user);
  }

  @Get('room/:room_id/latest')
  async getRoomLatestMessage(
    @CurrentUser() user: JwtPayload,
    @Param('room_id') room_id: string
  ): Promise<MessageResponse | null> {
    return this.messageService.getRoomLatestMessage(room_id, user);
  }

  @Get('room/:room_id/ids')
  async getRoomMessageIds(
    @CurrentUser() user: JwtPayload,
    @Param('room_id') room_id: string
  ): Promise<{ id: string }[]> {
    return this.messageService.getRoomMessageIds(room_id, user);
  }
} 