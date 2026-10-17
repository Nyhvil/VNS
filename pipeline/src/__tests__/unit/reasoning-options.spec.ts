import { getReasoningOptions } from '../../config/ai-endpoints';

describe('getReasoningOptions', () => {
  it('keeps Gemini thinking short by default', () => {
    expect(getReasoningOptions({ llmProvider: 'gemini' })).toEqual({ reasoning_effort: 'low' });
  });

  it('sends nothing to other providers unless asked', () => {
    expect(getReasoningOptions({ llmProvider: 'openai' })).toEqual({});
    expect(getReasoningOptions({})).toEqual({});
    expect(getReasoningOptions({ llmProvider: 'custom', llmReasoningEffort: 'medium' })).toEqual({ reasoning_effort: 'medium' });
  });

  it('can be switched off for Gemini', () => {
    expect(getReasoningOptions({ llmProvider: 'gemini', llmReasoningEffort: 'off' })).toEqual({});
  });
});
