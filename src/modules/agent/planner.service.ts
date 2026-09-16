import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { GoogleGenAI } from '@google/genai' with {
  'resolution-mode': 'require',
};
import { loadGoogleGenAI } from './google-genai-loader';
import type { EnvConfig } from '../../config/schemas/env.schema';
import { PlannerResponseSchema, PlannerOutput } from './schemas/planner.schema';

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);
  private genAI: GoogleGenAI | null = null;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  // Lazily constructs the Gemini client on first use rather than at module bootstrap to ensure it's only loaded when needed.
  private async getClient(): Promise<GoogleGenAI> {
    if (!this.genAI) {
      const { GoogleGenAI } = await loadGoogleGenAI();
      this.genAI = new GoogleGenAI({
        apiKey: this.configService.get('GEMINI_API_KEY', { infer: true }),
      });
    }
    return this.genAI;
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

    const genAI = await this.getClient();

    // Enforcing strict structured outputs via Gemini + Zod
    const response = await genAI.models.generateContent({
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

    let parsedPlan: PlannerOutput;
    try {
      parsedPlan = PlannerResponseSchema.parse(JSON.parse(rawText) as unknown);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Planner Agent returned unparseable output: ${message}`,
      );
      throw new Error(
        'Planner Agent failed to return a valid structured execution plan.',
        { cause: error },
      );
    }

    this.logger.log(
      `Plan generated successfully with ${parsedPlan.steps.length} steps.`,
    );

    return parsedPlan;
  }
}
