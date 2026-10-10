import { logAnalysisReceived, logAnalysisCompleted, logLayerError } from '../../logger/logger';

// Mock pino to capture log output
jest.mock('pino', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    level: 'info',
  };
  const pinoFn = jest.fn(() => mockLogger);
  (pinoFn as any).stdTimeFunctions = { isoTime: jest.fn() };
  return pinoFn;
});

// Mock config
jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => ({ logLevel: 'info' })),
}));

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logAnalysisReceived()', () => {
    it('should log with event analysis.received', () => {
      const pino = require('pino');
      const mockLogger = pino();

      logAnalysisReceived({
        job_id: 'test-job-id',
        input_type: 'email_text',
        request_size_bytes: 1024,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'analysis.received',
          job_id: 'test-job-id',
          input_type: 'email_text',
          request_size_bytes: 1024,
        })
      );
    });

    it('should NOT include content field in log', () => {
      const pino = require('pino');
      const mockLogger = pino();

      logAnalysisReceived({
        job_id: 'test-job-id',
        input_type: 'email_text',
        request_size_bytes: 512,
      });

      const callArgs = mockLogger.info.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('content');
    });
  });

  describe('logAnalysisCompleted()', () => {
    it('should log with event analysis.completed', () => {
      const pino = require('pino');
      const mockLogger = pino();

      logAnalysisCompleted({
        job_id: 'test-job-id',
        risk_score: 75,
        risk_level: 'high',
        category: 'phishing',
        duration_ms: 1500,
        layers_used: ['rule', 'rag'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'analysis.completed',
          job_id: 'test-job-id',
          risk_score: 75,
          risk_level: 'high',
          category: 'phishing',
          duration_ms: 1500,
          layers_used: ['rule', 'rag'],
        })
      );
    });
  });

  describe('logLayerError()', () => {
    it('should log with event analysis.layer_error at ERROR level', () => {
      const pino = require('pino');
      const mockLogger = pino();

      logLayerError({
        job_id: 'test-job-id',
        layer_name: 'rag',
        error_message: 'Qdrant unavailable',
        stack_trace: 'Error: ...',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'analysis.layer_error',
          job_id: 'test-job-id',
          layer_name: 'rag',
          error_message: 'Qdrant unavailable',
        })
      );
    });
  });
});
