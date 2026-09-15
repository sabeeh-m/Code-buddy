import { healthCheckResponseSchema } from './health-check-response.schema';

describe('healthCheckResponseSchema', () => {
  const validPayload = {
    status: 'ok' as const,
    timestamp: '2026-09-14T15:18:00.000Z',
    uptimeSeconds: 1.5,
  };

  it('accepts a valid health payload', () => {
    expect(healthCheckResponseSchema.parse(validPayload)).toEqual(validPayload);
  });

  it('rejects a non-ok status', () => {
    expect(() =>
      healthCheckResponseSchema.parse({
        ...validPayload,
        status: 'down',
      }),
    ).toThrow();
  });
});
