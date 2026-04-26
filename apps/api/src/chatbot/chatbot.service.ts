import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ClinicsService } from '../clinics/clinics.service';  
import { VisitsService } from '../visits/visits.service';    

@Injectable()
export class ChatbotService {
  private genAI: GoogleGenerativeAI;
  private chatSessions: Map<string, any> = new Map();
  private resourcesCache: { data: string; expiresAt: number } | null = null;
  private availabilityCache: { data: string; expiresAt: number } | null = null;

  constructor(
    private configService: ConfigService,
    private clinicsService: ClinicsService,       
    private visitsService: VisitsService,                        
  ) {
    this.genAI = new GoogleGenerativeAI(this.configService.getOrThrow<string>('GEMINI_API_KEY'));
  }

  private async getResourcesContext(): Promise<string> {
    const now = Date.now();
    if (this.resourcesCache && now < this.resourcesCache.expiresAt) {
      return this.resourcesCache.data;
    }

    const { data } = await this.clinicsService.findAll({ page: 1, limit: 100 }); // ← cambiado
    const lines: string[] = [];
    for (const c of data) {
      lines.push(`- ${c.name} (${c.specialty}), capacidad: ${c.capacity ?? 'no especificada'}, dirección: ${c.address}`); // ← campos de Clinic
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

    const { data: clinics } = await this.clinicsService.findAll({ page: 1, limit: 100 });
    const todayDate = new Date().toISOString().split('T')[0];

    // Una sola query de todas las visitas de hoy
   const todayVisits = await this.visitsService.findByDate(todayDate);


    const availabilityLines = clinics.map(clinic => {
      const clinicVisits = todayVisits.filter(v => v.clinicId === clinic.id);
      return `- ${clinic.name}: ${clinicVisits.length} visitas programadas hoy`;
    });

    const context = availabilityLines.join('\n');
    this.availabilityCache = { data: context, expiresAt: now + 1 * 60 * 1000 };
    return context;
  }

  async chat(message: string, sessionId: string): Promise<string> {
    const resourcesContext = await this.getResourcesContext();
    const availabilityContext = await this.getAvailabilityContext();

    const now = new Date();
    const currentHour = now.getUTCHours() + 2;
    const todayDate = now.toISOString().split('T')[0];

    if (!this.chatSessions.has(sessionId)) {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: `Eres el asistente virtual de una clínica médica.
        Hoy es ${todayDate} y la hora actual es ${currentHour}:00.
        Estas son las clínicas disponibles actualmente:
        ${resourcesContext}
        Esta es la actividad de hoy:
        ${availabilityContext}
        Ayuda a los usuarios a encontrar información sobre clínicas y visitas. Responde en español y de forma concisa y sin usar formato Markdown.`,
      });
      const session = model.startChat({ history: [] });
      this.chatSessions.set(sessionId, session);
    }

    const session = this.chatSessions.get(sessionId);
    const result = await session.sendMessage(message);
    return result.response.text();
  }
}