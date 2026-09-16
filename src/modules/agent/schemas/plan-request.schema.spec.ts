import { planRequestSchema } from './plan-request.schema';

describe('planRequestSchema', () => {
  it('accepts a valid prompt', () => {
    expect(planRequestSchema.parse({ prompt: 'Add a health check' })).toEqual({
      prompt: 'Add a health check',
    });
  });

  it('rejects an empty prompt', () => {
    expect(() => planRequestSchema.parse({ prompt: '' })).toThrow();
  });

  it('rejects a missing prompt', () => {
    expect(() => planRequestSchema.parse({})).toThrow();
  });

  it('rejects a non-string prompt', () => {
    expect(() => planRequestSchema.parse({ prompt: 123 })).toThrow();
  });
});
