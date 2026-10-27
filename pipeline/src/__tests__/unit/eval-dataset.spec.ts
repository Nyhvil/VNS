/**
 * Regression check of the rule layers (no LLM, no RAG) on the evaluation sets
 * in data/eval. The numbers are a floor: a change that makes them worse fails.
 * Run `npm run eval` for the full report.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { extractFeatures } from '../../features/feature-extractor';
import { parsePlainText } from '../../parser/plain-text-parser';
import { evaluateRules } from '../../rules/rule-engine';

const DATA = path.resolve(__dirname, '../../../data');
const load = (file: string) => JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));

const dev = load('eval/dev.json');
const holdout = load('eval/holdout.json');
const seed: string[] = load('scam_samples.vi.json').samples.map((s: { text: string }) => s.text);

/** Share of texts the rules rate at least SUSPICIOUS (score > 30). */
const flaggedShare = (texts: string[]) =>
  texts.filter(t => evaluateRules(extractFeatures(parsePlainText(t))).score > 30).length / texts.length;

describe('rule layers on the evaluation sets', () => {
  it('flag most scams', () => {
    expect(flaggedShare(seed)).toBeGreaterThanOrEqual(0.9);
    expect(flaggedShare(dev.new_scam)).toBeGreaterThanOrEqual(0.9);
    expect(flaggedShare(holdout.scam)).toBeGreaterThanOrEqual(0.9);
  });

  it('rarely flag ordinary messages', () => {
    expect(flaggedShare(dev.safe)).toBeLessThanOrEqual(0.05);
    expect(flaggedShare(holdout.safe)).toBeLessThanOrEqual(0.05);
  });
});
