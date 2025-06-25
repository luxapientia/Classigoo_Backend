import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chemistry } from './schemas/chemistry.schema';
import { MathAI } from './schemas/math.schema';
import { Physics } from './schemas/physics.schema';
import { Limit } from './schemas/limit.schema';
import { OpenAIConfig } from './config/openai.config';
import { ChatDto, ChatResponseDto } from './dto/chat.dto';
import { HistoryDto, HistoryResponseDto } from './dto/history.dto';
import { SearchDto, SearchResponseDto } from './dto/search.dto';
import { RetrieveDto, RetrieveResponseDto } from './dto/retrieve.dto';
import { JwtPayload } from '../../common/decorators/user.decorator';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AIBuddyService {
  private readonly DAILY_LIMIT: number;
  private readonly models: Record<string, Model<any>>;
  private readonly systemMessages: Record<string, string> = {
    chemistry: `
You are Chemistry Buddy, an AI assistant who helps users understand chemistry concepts.

You respond in a friendly, educational tone, guide users through problems step by step, and always check for understanding at each stage.

== Math Rendering Rules ==
You are writing inside a KaTeX-rendered Markdown environment.

- Use **$...$** for all math expressions (no double dollar signs).
- All math should be **inline**; do not use display blocks with \`\$\$\`.
- Do NOT escape LaTeX (do not use \\\\ before symbols like \\frac, just write \\frac).
- Example: Use \`$H_2O$\` to render water's chemical formula.

== Response Format ==
- Write in clear Markdown.
- Use lists, headings, and formatting to organize explanations.
- Render math with LaTeX using $...$.
- Keep things simple and educational.

Always pause to ask the user if they'd like to go deeper or try an example problem.
`,
    math: `
You are MathAI Buddy, an AI assistant who helps users understand math concepts.

You respond in a friendly, educational tone, guide users through problems step by step, and always check for understanding at each stage.

== Math Rendering Rules ==
You are writing inside a KaTeX-rendered Markdown environment.

- Use **$...$** for all math expressions (no double dollar signs).
- All math should be **inline**; do not use display blocks with \`\$\$\`.
- Do NOT escape LaTeX (do not use \\\\ before symbols like \\frac, just write \\frac).
- Example: Use \`$F = k \\frac{|q_1 q_2|}{r^2}$\` to render Coulomb's Law.

== Response Format ==
- Write in clear Markdown.
- Use lists, headings, and formatting to organize explanations.
- Render math with LaTeX using $...$.
- Keep things simple and educational.

Always pause to ask the user if they'd like to go deeper or try an example problem.
`,
    physics: `
You are Physics Buddy, an AI assistant who helps users understand physics concepts.

You respond in a friendly, educational tone, guide users through problems step by step, and always check for understanding at each stage.

== Math Rendering Rules ==
You are writing inside a KaTeX-rendered Markdown environment.

- Use **$...$** for all math expressions (no double dollar signs).
- All math should be **inline**; do not use display blocks with \`\$\$\`.
- Do NOT escape LaTeX (do not use \\\\ before symbols like \\frac, just write \\frac).
- Example: Use \`$F = k \\frac{|q_1 q_2|}{r^2}$\` to render Coulomb's Law.

== Response Format ==
- Write in clear Markdown.
- Use lists, headings, and formatting to organize explanations.
- Render math with LaTeX using $...$.
- Keep things simple and educational.

Always pause to ask the user if they'd like to go deeper or try an example problem.
`,
  };

  constructor(
    @InjectModel(Chemistry.name) private chemistryModel: Model<Chemistry>,
    @InjectModel(MathAI.name) private mathModel: Model<MathAI>,
    @InjectModel(Physics.name) private physicsModel: Model<Physics>,
    @InjectModel(Limit.name) private limitModel: Model<Limit>,
    private openaiConfig: OpenAIConfig,
    private configService: ConfigService,
  ) {
    this.models = {
      chemistry: this.chemistryModel,
      math: this.mathModel,
      physics: this.physicsModel,
    };
    this.DAILY_LIMIT = this.configService.get('env.openai.dailyLimit') || 100;
  }

  private getModelByName(modelName: string): Model<any> {
    const model = this.models[modelName.toLowerCase()];
    if (!model) {
      throw new BadRequestException('Invalid model name');
    }
    return model;
  }

  private getSystemMessage(modelName: string): string {
    const message = this.systemMessages[modelName.toLowerCase()];
    if (!message) {
      throw new BadRequestException('Invalid model name');
    }
    return message;
  }

  private async checkAndUpdateLimit(userId: string, isRequest: boolean = false): Promise<number> {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));

    let limit = await this.limitModel.findOne({ user_id: userId });
    if (!limit) {
      limit = await this.limitModel.create({ user_id: userId });
    }

    if (limit.last_reset_time < startOfDay) {
      limit.request_count = 0;
      limit.last_reset_time = now;
    }

    if (limit.request_count >= this.DAILY_LIMIT && isRequest) {
      return 0;
    }

    limit.request_count += isRequest ? 1 : 0;
    limit.last_request_time = now;
    await limit.save();

    return this.DAILY_LIMIT - limit.request_count;
  }

  async chat(user: JwtPayload, chatDto: ChatDto): Promise<ChatResponseDto> {
    if (!chatDto.prompt) {
      throw new BadRequestException('Prompt is required');
    }

    const remainingLimit = await this.checkAndUpdateLimit(user.user_id, true);
    if (remainingLimit === 0) {
      throw new BadRequestException(`You have reached your daily limit of ${this.DAILY_LIMIT} requests. Please try again tomorrow.`);
    }

    const model = this.getModelByName(chatDto.model);
    let chat;

    if (chatDto.chat_id) {
      console.log('chatDto.chat_id', chatDto.chat_id);
      console.log('model', model);
      chat = await model.findById(chatDto.chat_id);
      if (!chat || chat.user_id.toString() !== user.user_id) {
        throw new UnauthorizedException('Chat not found or unauthorized');
      }
    } else {
      const chatSubject = await this.openaiConfig.generateChatSubject(chatDto.prompt);
      chat = await model.create({
        user_id: user.user_id,
        chat_name: chatSubject,
        chat_history: [],
      });
    }

    const messages = [
      { role: 'developer', content: this.getSystemMessage(chatDto.model) },
      ...chat.chat_history,
      { role: 'user', content: chatDto.prompt },
    ];

    const response = await this.openaiConfig.generateChatCompletion(messages);
    
    chat.chat_history.push(
      { role: 'user', content: chatDto.prompt },
      { role: 'assistant', content: response },
    );
    await chat.save();

    return {
      status: 'success',
      message: 'Response generated successfully',
      limits: remainingLimit,
      content: response,
      chat_id: chat._id.toString(),
    };
  }

  async getHistory(
    user: JwtPayload,
    historyDto: HistoryDto,
  ): Promise<HistoryResponseDto> {
    const model = this.getModelByName(historyDto.model);
    const skip = (historyDto.page - 1) * historyDto.limit;

    const [chats, total] = await Promise.all([
      model
        .find({ user_id: user.user_id })
        .sort({ updated_at: -1 })
        .skip(skip)
        .limit(historyDto.limit)
        .select('_id chat_name updated_at'),
      model.countDocuments({ user_id: user.user_id }),
    ]);

    // is last page
    const isLastPage = total <= skip + historyDto.limit;

    return {
      status: 'success',
      message: 'History fetched successfully',
      history: chats,
      pagination: {
        total,
        page: historyDto.page,
        limit: historyDto.limit,
        total_pages: Math.ceil(total / historyDto.limit),
        has_next_page: !isLastPage,
      },
    };
  }

  async search(user: JwtPayload, searchDto: SearchDto): Promise<SearchResponseDto> {
    const model = this.getModelByName(searchDto.model);
    
    const chats = await model.find({
      user_id: user.user_id,
      $or: [
        { chat_name: { $regex: searchDto.query, $options: 'i' } },
        { 'chat_history.content': { $regex: searchDto.query, $options: 'i' } },
      ],
    }).sort({ updated_at: -1 });

    const formattedChats = chats.map((chat) => ({
      id: chat._id.toString(),
      chat_name: chat.chat_name,
      last_message: chat.chat_history[chat.chat_history.length - 1]?.content,
      updated_at: chat.updated_at,
    }));

    return {
      status: 'success',
      message: 'Search results fetched successfully',
      data: formattedChats,
    };
  }

  async retrieve(
    user: JwtPayload,
    retrieveDto: RetrieveDto,
  ): Promise<RetrieveResponseDto> {
    const model = this.getModelByName(retrieveDto.model);
    const chat = await model.findById(retrieveDto.chat_id);

    if (!chat || chat.user_id.toString() !== user.user_id) {
      throw new UnauthorizedException('Chat not found or unauthorized');
    }

    return {
      status: 'success',
      message: 'Chat retrieved successfully',
      limit: await this.checkAndUpdateLimit(user.user_id),
      chats: chat.chat_history,
      not_found: false,
    };
  }
} 