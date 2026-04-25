import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ChatbotModule } from '../chatbot/chatbot.module';

@Module({
  imports: [ChatbotModule],
  providers: [TelegramService],
})
export class TelegramModule {}