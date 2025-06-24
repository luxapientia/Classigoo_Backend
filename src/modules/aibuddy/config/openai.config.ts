import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAIConfig {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('env.openai.apiKey'),
      organization: this.configService.get<string>('env.openai.orgId'),
      timeout: this.configService.get<number>('env.openai.timeout', 10) * 1000,
      maxRetries: this.configService.get<number>('env.openai.maxRetries', 2),
    });
  }

  getOpenAI(): OpenAI {
    return this.openai;
  }

  async generateChatCompletion(messages: any[], model?: string) {
    const completion = await this.openai.chat.completions.create({
      model: model || this.configService.get<string>('env.openai.model', 'gpt-3.5-turbo'),
      messages,
      temperature: this.configService.get<number>('env.openai.temperature', 0.7),
    });

    return completion.choices[0].message.content || 'Untitled Chat';
  }

  async generateChatSubject(message: string): Promise<string> {
    try {
      const prompt = `Here is the start of a chat conversation:\n\n${message}\n\nWrite a short, clear title (max 6 words) that describes this chat topic.`;

      // const completion = await this.openai.chat.completions.create({
      //   model: this.configService.get<string>('env.openai.model', 'gpt-3.5-turbo'),
      //   messages: [{ role: 'user', content: prompt }],
      //   temperature: 0.7,
      // });

      // return completion.choices[0].message.content?.trim() || 'Untitled Chat';

      const response = await this.openai.responses.create({
        model: this.configService.get<string>('env.openai.model', 'gpt-3.5-turbo'),
        input: prompt,
      });

      return response.output_text?.trim() || 'Untitled Chat';
    } catch (error) {
      console.error('Error generating chat subject:', error);
      return 'Untitled Chat';
    }
  }
} 