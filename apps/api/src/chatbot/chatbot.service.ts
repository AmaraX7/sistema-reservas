import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ResourcesService } from '../resources/resources.service';
import { ReservationsService } from '../reservations/reservations.service';

@Injectable()
export class ChatbotService {
  private genAI: GoogleGenerativeAI; 
  // como el genai no es algo de nest js no puedo inyectarla
  // en cambio todo lo de nest es un  singleton, entonces al poner configservice en el constructor , uso la misma instancia en toda la app. 

  private chatSessions: Map<string, any> = new Map();
  private resourcesCache: { data: string; expiresAt: number } | null = null;
  private availabilityCache: { data: string; expiresAt: number } | null = null;

  constructor(private configService: ConfigService, private resourcesService: ResourcesService, private reservationsService: ReservationsService) {
    this.genAI = new GoogleGenerativeAI(this.configService.getOrThrow<string>('GEMINI_API_KEY'));
  }

    private async getResourcesContext(): Promise<string> {
    const now = Date.now();
    if (this.resourcesCache && now < this.resourcesCache.expiresAt) {
      return this.resourcesCache.data;
    }

    const { data } = await this.resourcesService.findAll({ page: 1, limit: 100 });
    const lines: string[] = [];
    for (const r of data) {
      let capacity: string;
      if (r.capacity !== null) {
        capacity = String(r.capacity);
      } else {
        capacity = 'no especificada';
      }
      lines.push(`- ${r.name} (${r.type}), capacidad: ${capacity}, estado: ${r.status}, ubicación: ${r.location}`);
    }
    const context = lines.join('\n');

    this.resourcesCache = { data: context, expiresAt: now + 5 * 60 * 1000 };
    return context;
  }

private async getAvailabilityContext(): Promise<string> {
  const now = Date.now();
  if (this.availabilityCache && now < this.availabilityCache.expiresAt) {
    return this.availabilityCache.data;
  }

  const { data } = await this.resourcesService.findAll({ page: 1, limit: 100 });
  const todayDate = new Date().toISOString().split('T')[0];
  const availabilityList = await Promise.all(
    data.map(r => this.reservationsService.getAvailability(r.id, todayDate))
  );

  const availabilityLines: string[] = [];
  for (let i = 0; i < data.length; i++) {
    const resource = data[i];
    const availability = availabilityList[i];
    const slots = availability.availableSlots
      .map(s => `${s.start}-${s.end}`)
      .join(', ');
    availabilityLines.push(`- ${resource.name}: ${slots || 'sin slots disponibles'}`);
  }

  const context = availabilityLines.join('\n');
  this.availabilityCache = { data: context, expiresAt: now + 1 * 60 * 1000 };
  return context;
}

  async chat(message: string, sessionId: string): Promise<string> {

    const resourcesContext = await this.getResourcesContext();
    const availabilityContext = await this.getAvailabilityContext();

    const now = new Date();
    const currentHour = now.getUTCHours() + 2; // UTC+2 en españa
    const todayDate = now.toISOString().split('T')[0];
    
    if (!this.chatSessions.has(sessionId)) {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: `Eres el asistente virtual de Unibook, un sistema de reservas de coworking.
        Hoy es ${todayDate} y la hora actual es ${currentHour}:00.
        Estos son los espacios disponibles actualmente:
        ${resourcesContext}
        Estos son los slots disponibles para hoy:
        ${availabilityContext}
        Ayuda a los usuarios a encontrar el espacio más adecuado. Responde en español y de forma concisa y sin usar formato Markdown.`,
      });
      const session = model.startChat({ history: [] });
      this.chatSessions.set(sessionId, session);
  }

  const session = this.chatSessions.get(sessionId);
  const result = await session.sendMessage(message);
  return result.response.text();
  }

}