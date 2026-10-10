import * as fc from 'fast-check';
import { validateAnalysisRequest } from '../../http/schemas/analyze.schema';

const VALID_INPUT_TYPES = ['email_text', 'plain_text', 'eml_file', 'image'] as const;

// Arbitrary for valid UUID v4
const uuidArb = fc.uuid();

// Arbitrary for invalid type strings (not in the valid set)
const invalidTypeArb = fc.string({ minLength: 1 }).filter(
  s => !VALID_INPUT_TYPES.includes(s as any)
);

// Arbitrary for non-UUID strings (not matching UUID pattern)
const nonUuidArb = fc.string({ minLength: 1 }).filter(
  s => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
);

describe('Request Validation — Property Tests', () => {
  // Feature: phishing-analysis-pipeline, Property: invalid request rejection

  describe('Property 5.3.1: Invalid type strings → 422', () => {
    it('should return status 422 for any invalid type string', () => {
      fc.assert(
        fc.property(
          uuidArb,
          invalidTypeArb,
          fc.string({ minLength: 1 }),
          (jobId, invalidType, content) => {
            const result = validateAnalysisRequest({
              job_id: jobId,
              type: invalidType,
              content,
            });

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.status).toBe(422);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5.3.2: Non-UUID job_id strings → 400', () => {
    it('should return status 400 for any non-UUID job_id', () => {
      fc.assert(
        fc.property(
          nonUuidArb,
          fc.constantFrom(...VALID_INPUT_TYPES),
          fc.string({ minLength: 1 }),
          (nonUuid, validType, content) => {
            const result = validateAnalysisRequest({
              job_id: nonUuid,
              type: validType,
              content,
            });

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.status).toBe(400);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5.3.3: Missing required fields → 400', () => {
    it('should return status 400 when job_id is missing', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_INPUT_TYPES),
          fc.string({ minLength: 1 }),
          (validType, content) => {
            const result = validateAnalysisRequest({
              type: validType,
              content,
            });

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.status).toBe(400);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return status 400 when content is missing', () => {
      fc.assert(
        fc.property(
          uuidArb,
          fc.constantFrom(...VALID_INPUT_TYPES),
          (jobId, validType) => {
            const result = validateAnalysisRequest({
              job_id: jobId,
              type: validType,
            });

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.status).toBe(400);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return status 400 when type is missing', () => {
      fc.assert(
        fc.property(
          uuidArb,
          fc.string({ minLength: 1 }),
          (jobId, content) => {
            const result = validateAnalysisRequest({
              job_id: jobId,
              content,
            });

            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.status).toBe(400);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Valid requests should pass validation', () => {
    it('should succeed for any valid request', () => {
      fc.assert(
        fc.property(
          uuidArb,
          fc.constantFrom(...VALID_INPUT_TYPES),
          fc.string({ minLength: 1 }),
          (jobId, validType, content) => {
            const result = validateAnalysisRequest({
              job_id: jobId,
              type: validType,
              content,
            });

            expect(result.success).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
