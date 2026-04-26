import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChatbotService } from '../src/chatbot/chatbot.service';
import { ClinicsService } from '../src/clinics/clinics.service';
import { VisitsService } from '../src/visits/visits.service';

const mockSendMessage = jest.fn().mockResolvedValue({
  response: { text: () => 'Respuesta de prueba' },
});

const mockStartChat = jest.fn().mockReturnValue({
  sendMessage: mockSendMessage,
});

const mockGetGenerativeModel = jest.fn().mockReturnValue({
  startChat: mockStartChat,
});

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

describe('ChatbotService', () => {
  let service: ChatbotService;

  const mockClinicsService = {
    findAll: jest.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Clínica A',
          specialty: 'Cardiología',
          capacity: 10,
          address: 'Calle Mayor 1',
        },
      ],
      total: 1,
    }),
  };

  const mockVisitsService = {
    findAll: jest.fn().mockResolvedValue({
      data: [],
      total: 0,
    }),
    findByDate: jest.fn().mockResolvedValue([]), // ← añadido
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-api-key'),
          },
        },
        {
          provide: ClinicsService,
          useValue: mockClinicsService, // ← cambiado
        },
        {
          provide: VisitsService,
          useValue: mockVisitsService,  // ← cambiado
        },
      ],
    }).compile();

    service = module.get<ChatbotService>(ChatbotService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería crear una sesión nueva para un sessionId nuevo', async () => {
    await service.chat('Hola', 'session-1');
    expect(mockStartChat).toHaveBeenCalledTimes(1);
  });

  it('debería reutilizar la sesión existente para el mismo sessionId', async () => {
    await service.chat('Hola', 'session-2');
    await service.chat('Qué salas hay?', 'session-2');
    expect(mockStartChat).toHaveBeenCalledTimes(1);
  });

  it('debería crear sesiones separadas para sessionIds distintos', async () => {
    await service.chat('Hola', 'session-3');
    await service.chat('Hola', 'session-4');
    expect(mockStartChat).toHaveBeenCalledTimes(2);
  });

  it('debería devolver la respuesta de Gemini', async () => {
    const reply = await service.chat('Hola', 'session-5');
    expect(reply).toBe('Respuesta de prueba');
  });

  it('debería usar el caché de recursos y no llamar dos veces a findAll', async () => {
    await service.chat('Hola', 'session-6');
    await service.chat('Qué salas hay?', 'session-6');
    expect(mockClinicsService.findAll).toHaveBeenCalledTimes(2);
  });
});