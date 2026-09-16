import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { GoogleGenAI } from '@google/genai' with {
  'resolution-mode': 'require',
};
import { loadGoogleGenAI } from './google-genai-loader';
import type { EnvConfig } from '../../../config/schemas/env.schema';
import {
  PlannerResponseSchema,
  PlannerOutput,
} from '../schemas/planner.schema';

@Injectable()
export class PlannerService implements OnModuleInit {
  private readonly logger = new Logger(PlannerService.name);
  private genAI!: GoogleGenAI;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  async onModuleInit(): Promise<void> {
    // @google/genai ships .cjs at runtime but no matching .d.cts, so
    // TypeScript's nodenext resolution can't verify a static import is safe
    // in this CommonJS project (TS1479) even though the runtime require()
    // works fine. loadGoogleGenAI() isolates the dynamic import that
    // sidesteps the static check (see google-genai-loader.ts for why).
    const { GoogleGenAI } = await loadGoogleGenAI();
    this.genAI = new GoogleGenAI({
      apiKey: this.configService.get('GEMINI_API_KEY', { infer: true }),
    });
  }

  /**
   * Ingests a prompt and file tree, then generates a structured architectural plan.
   */
  async createPlan(prompt: string, fileTree: string[]): Promise<PlannerOutput> {
    this.logger.log('Generating execution plan with Planner Agent...');

    const systemInstruction = `
      You are a Senior Software Architect. Your job is to analyze the user request and the repository's file structure.
      Deconstruct the requirement into an efficient, ordered step-by-step execution plan.
      CRITICAL: Do not write code or implement changes. Focus purely on structural strategy and identifying which files need modification.
    `;

    const userContent = `
      User Request: ${prompt}

      Repository File Tree:
      ${JSON.stringify(fileTree, null, 2)}
    `;

    // Enforcing strict structured outputs via Gemini + Zod
    const response = await this.genAI.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: userContent,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: z.toJSONSchema(PlannerResponseSchema),
      },
    });

    const rawText = response.text;

    if (!rawText) {
      throw new Error(
        'Planner Agent failed to return a valid structured execution plan.',
      );
    }

    const parsedPlan = PlannerResponseSchema.parse(
      JSON.parse(rawText) as unknown,
    );

    this.logger.log(
      `Plan generated successfully with ${parsedPlan.steps.length} steps.`,
    );

    return parsedPlan;
  }
}
