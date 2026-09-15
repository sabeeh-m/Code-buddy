import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

const sampleSchema = z.object({
  name: z.string().min(1),
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(sampleSchema);

  it('returns parsed data when the payload is valid', () => {
    expect(pipe.transform({ name: 'health' })).toEqual({ name: 'health' });
  });

  it('throws BadRequestException when the payload is invalid', () => {
    expect(() => pipe.transform({ name: '' })).toThrow(BadRequestException);
  });
});
