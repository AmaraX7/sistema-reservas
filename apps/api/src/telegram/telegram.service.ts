import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { ChatbotService } from '../chatbot/chatbot.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Telegraf;

  constructor(
    private configService: ConfigService,
    private chatbotService: ChatbotService,
  ) {
    this.bot = new Telegraf(this.configService.getOrThrow('TELEGRAM_BOT_TOKEN'));
  }

  onModuleInit() {
      if (this.configService.get('NODE_ENV') !== 'production') {
    console.log('Telegram bot disabled in development');
    return;
  }

    this.bot.on('text', async (ctx) => {
      const message = ctx.message.text;
      const sessionId = String(ctx.from.id); // id de telegram como sessionId
      const reply = await this.chatbotService.chat(message, sessionId);
      await ctx.reply(reply);
    });

    void this.bot.launch();
  }
}