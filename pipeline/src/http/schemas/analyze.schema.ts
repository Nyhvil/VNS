import { z } from 'zod';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const InputTypeSchema = z.enum(['email_text', 'plain_text', 'eml_file', 'image'], {
  errorMap: (issue, ctx) => {
    if (issue.code === z.ZodIssueCode.invalid_enum_value) {
      return {
        message: `Invalid type: "${ctx.data}". Must be one of: email_text, plain_text, eml_file, image`,
      };
    }
    return { message: ctx.defaultError };
  },
});

export const AnalysisRequestSchema = z.object({
  job_id: z
    .string({ required_error: 'Missing required field: job_id' })
    .regex(UUID_REGEX, 'Invalid UUID format for job_id'),
  type: InputTypeSchema,
  content: z.string({ required_error: 'Missing required field: content' }).min(1, 'Missing required field: content'),
  metadata: z.record(z.unknown()).optional(),
});

export type AnalysisRequestInput = z.infer<typeof AnalysisRequestSchema>;

// Validation result types
export interface ValidationSuccess {
  success: true;
  data: AnalysisRequestInput;
}

export interface ValidationFailure {
  success: false;
  status: 400 | 422;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export function validateAnalysisRequest(body: unknown): ValidationResult {
  const result = AnalysisRequestSchema.safeParse(body);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const firstError = result.error.errors[0];
  if (!firstError) {
    return { success: false, status: 400, error: 'Invalid request' };
  }

  // Determine HTTP status code based on error type
  const isTypeError =
    firstError.path.includes('type') &&
    firstError.code === 'invalid_enum_value';

  const status: 400 | 422 = isTypeError ? 422 : 400;

  return {
    success: false,
    status,
    error: firstError.message,
  };
}
