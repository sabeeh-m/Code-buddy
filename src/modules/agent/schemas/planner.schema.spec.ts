import { PlannerResponseSchema } from './planner.schema';

describe('PlannerResponseSchema', () => {
  it('accepts a valid plan', () => {
    const payload = {
      analysis: 'The health check lacks a Redis connectivity check.',
      steps: [
        {
          file: 'src/modules/health/health.service.ts',
          action: 'Add a Redis ping check.',
        },
      ],
    };
    expect(PlannerResponseSchema.parse(payload)).toEqual(payload);
  });

  it('accepts an empty steps array', () => {
    const payload = { analysis: 'No changes needed.', steps: [] };
    expect(PlannerResponseSchema.parse(payload)).toEqual(payload);
  });

  it('rejects a payload missing analysis', () => {
    expect(() =>
      PlannerResponseSchema.parse({
        steps: [{ file: 'a.ts', action: 'do something' }],
      }),
    ).toThrow();
  });

  it('rejects a step missing action', () => {
    expect(() =>
      PlannerResponseSchema.parse({
        analysis: 'Some analysis.',
        steps: [{ file: 'a.ts' }],
      }),
    ).toThrow();
  });

  it('rejects a non-array steps field', () => {
    expect(() =>
      PlannerResponseSchema.parse({
        analysis: 'Some analysis.',
        steps: 'not-an-array',
      }),
    ).toThrow();
  });
});
