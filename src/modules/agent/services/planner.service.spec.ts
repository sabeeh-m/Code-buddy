import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PlannerService } from './planner.service';

const mockGenerateContent = jest.fn();

jest.mock('./google-genai-loader', () => ({
  loadGoogleGenAI: jest.fn().mockResolvedValue({
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: { generateContent: mockGenerateContent },
    })),
  }),
}));

describe('PlannerService', () => {
  let service: PlannerService;

  beforeEach(async () => {
    mockGenerateContent.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlannerService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('fake-api-key') },
        },
      ],
    }).compile();

    service = module.get<PlannerService>(PlannerService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns a parsed plan when Gemini responds with valid JSON', async () => {
    const plan = {
      analysis: 'Needs a new endpoint.',
      steps: [{ file: 'a.ts', action: 'do it' }],
    };
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(plan) });

    const result = await service.createPlan('add X', ['a.ts', 'b.ts']);

    expect(result).toEqual(plan);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.stringContaining('add X') as unknown,
        config: expect.objectContaining({
          responseMimeType: 'application/json',
        }) as unknown,
      }),
    );
  });

  it('throws when Gemini returns no text', async () => {
    mockGenerateContent.mockResolvedValue({ text: undefined });

    await expect(service.createPlan('add X', [])).rejects.toThrow(
      'Planner Agent failed to return a valid structured execution plan.',
    );
  });

  it('throws when Gemini returns JSON that does not match the schema', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ wrong: 'shape' }),
    });

    await expect(service.createPlan('add X', [])).rejects.toThrow();
  });
});
