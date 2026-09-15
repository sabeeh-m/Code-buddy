import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('applies defaults when optional variables are missing', () => {
    expect(validateEnv({})).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      THROTTLE_TTL_MS: 60_000,
      THROTTLE_LIMIT: 100,
    });
  });

  it('coerces numeric string env vars', () => {
    expect(
      validateEnv({
        NODE_ENV: 'production',
        PORT: '4000',
        REDIS_HOST: 'redis.internal',
        REDIS_PORT: '6380',
        CORS_ORIGIN: 'https://example.com',
        THROTTLE_TTL_MS: '30000',
        THROTTLE_LIMIT: '50',
      }),
    ).toEqual({
      NODE_ENV: 'production',
      PORT: 4000,
      REDIS_HOST: 'redis.internal',
      REDIS_PORT: 6380,
      CORS_ORIGIN: 'https://example.com',
      THROTTLE_TTL_MS: 30_000,
      THROTTLE_LIMIT: 50,
    });
  });

  it('throws with a readable message for an invalid NODE_ENV', () => {
    expect(() => validateEnv({ NODE_ENV: 'staging' })).toThrow(
      /Invalid environment variables/,
    );
  });

  it('throws for a non-numeric PORT', () => {
    expect(() => validateEnv({ PORT: 'not-a-number' })).toThrow(
      /Invalid environment variables/,
    );
  });
});
