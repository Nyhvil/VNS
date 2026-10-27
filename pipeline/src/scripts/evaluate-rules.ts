/**
 * Report how the rule layers (no LLM, no RAG) rate the evaluation sets:
 *
 *   npm run build && npm run eval
 *
 * Sets: data/scam_samples.vi.json (scam), data/eval/dev.json (new_scam, safe),
 * data/eval/holdout.json (scam, safe). Lists every miss so the rules can be
 * improved, and prints the time per message.
 */
import * as fs from 'fs';
import * as path from 'path';
import { extractFeatures } from '../features/feature-extractor';
import { parsePlainText } from '../parser/plain-text-parser';
import { evaluateRules } from '../rules/rule-engine';

const DATA = path.resolve(__dirname, '../../data');
const load = (file: string) => JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));

const dev = load('eval/dev.json');
const holdout = load('eval/holdout.json');

const sets: { name: string; scam: boolean; texts: string[] }[] = [
  { name: 'Mẫu lừa đảo (scam_samples)', scam: true, texts: load('scam_samples.vi.json').samples.map((s: { text: string }) => s.text) },
  { name: 'Lừa đảo mới (dev)', scam: true, texts: dev.new_scam },
  { name: 'Tin bình thường (dev)', scam: false, texts: dev.safe },
  { name: 'Lừa đảo (holdout)', scam: true, texts: holdout.scam },
  { name: 'Tin bình thường (holdout)', scam: false, texts: holdout.safe },
];

const level = (score: number) => (score <= 30 ? 'AN TOÀN' : score <= 70 ? 'ĐÁNG NGHI' : 'LỪA ĐẢO');
const pct = (n: number, total: number) => `${Math.round((100 * n) / total)}%`;

for (const set of sets) {
  const started = process.hrtime.bigint();
  const scores = set.texts.map(text => ({ text, score: evaluateRules(extractFeatures(parsePlainText(text))).score }));
  const ms = Number(process.hrtime.bigint() - started) / 1e6 / set.texts.length;

  const flagged = scores.filter(s => s.score > 30);
  const scam = scores.filter(s => s.score > 70);
  console.log(
    `\n${set.name}: ${set.texts.length} tin · LỪA ĐẢO ${pct(scam.length, scores.length)} · ` +
      `LỪA ĐẢO hoặc ĐÁNG NGHI ${pct(flagged.length, scores.length)} · ${ms.toFixed(2)} ms/tin`
  );

  const misses = set.scam ? scores.filter(s => s.score <= 30) : flagged;
  for (const miss of misses) console.log(`  ${set.scam ? 'bỏ sót' : 'báo nhầm'} [${level(miss.score)} ${miss.score}] ${miss.text.slice(0, 100)}`);
}
