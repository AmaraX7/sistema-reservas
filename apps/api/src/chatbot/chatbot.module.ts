import { Module } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { ResourcesModule } from '../resources/resources.module';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [ ResourcesModule, ReservationsModule ],
  providers: [ChatbotService],
  controllers: [ChatbotController],
  exports: [ChatbotService],
})
export class ChatbotModule {}
