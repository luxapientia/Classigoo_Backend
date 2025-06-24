import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AIBuddyService } from './aibuddy.service';
import { ChatDto, ChatResponseDto } from './dto/chat.dto';
import { HistoryDto, HistoryResponseDto } from './dto/history.dto';
import { SearchDto, SearchResponseDto } from './dto/search.dto';
import { RetrieveDto, RetrieveResponseDto } from './dto/retrieve.dto';
import { UserGuard } from '../../shared/guards/user.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/user.decorator';

@Controller('v1/aibuddy')
@UseGuards(UserGuard)
export class AIBuddyController {
  constructor(private readonly aiBuddyService: AIBuddyService) {}

  @Post('chat')
  async chat(
    @CurrentUser() user: JwtPayload,
    @Body() chatDto: ChatDto,
  ): Promise<ChatResponseDto> {
    try {
      return await this.aiBuddyService.chat(user, chatDto);
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        limits: 0,
        content: '',
        chat_id: '',
      };
    }
  }

  @Post('history')
  async getHistory(
    @CurrentUser() user: JwtPayload,
    @Body() historyDto: HistoryDto,
  ): Promise<HistoryResponseDto> {
    try {
      return await this.aiBuddyService.getHistory(user, historyDto);
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        history: [],
        pagination: {
          total: 0,
          page: historyDto.page,
          limit: historyDto.limit,
          total_pages: 0,
          has_next_page: false,
        },
      };
    }
  }

  @Post('search')
  async search(
    @CurrentUser() user: JwtPayload,
    @Body() searchDto: SearchDto,
  ): Promise<SearchResponseDto> {
    try {
      return await this.aiBuddyService.search(user, searchDto);
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: [],
      };
    }
  }

  @Post('retrieve')
  async retrieve(
    @CurrentUser() user: JwtPayload,
    @Body() retrieveDto: RetrieveDto,
  ): Promise<RetrieveResponseDto> {
    try {
      return await this.aiBuddyService.retrieve(user, retrieveDto);
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        limit: 0,
        chats: [],
        not_found: true,
      };
    }
  }
} 