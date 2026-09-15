import { sandboxExecutionResponseSchema } from './sandbox-execution-response.schema';

describe('sandboxExecutionResponseSchema', () => {
  it('accepts a successful execution payload', () => {
    const payload = {
      success: true as const,
      tempDirUsed: '/tmp/agent-sandbox-abc123',
      result: { exitCode: 0, stdout: 'hello', stderr: '' },
    };
    expect(sandboxExecutionResponseSchema.parse(payload)).toEqual(payload);
  });

  it('accepts a failed execution payload', () => {
    const payload = { success: false as const, error: 'something broke' };
    expect(sandboxExecutionResponseSchema.parse(payload)).toEqual(payload);
  });

  it('rejects a success payload missing the result', () => {
    expect(() =>
      sandboxExecutionResponseSchema.parse({
        success: true,
        tempDirUsed: '/tmp/agent-sandbox-abc123',
      }),
    ).toThrow();
  });

  it('rejects an unknown success value', () => {
    expect(() =>
      sandboxExecutionResponseSchema.parse({
        success: 'yes',
        tempDirUsed: '/tmp/agent-sandbox-abc123',
        result: { exitCode: 0, stdout: '', stderr: '' },
      }),
    ).toThrow();
  });
});
