import { Body, Controller, Post } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post()
  async chat(@Body('message') message: string, @Body('sessionId') sessionId: string) {
    const reply = await this.chatbotService.chat(message, sessionId);
    return { reply };
  }
}