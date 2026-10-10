import { rerankMatches, tokenize, lexicalOverlap } from '../../rag/reranker';
import { RagMatch } from '../../types';

const match = (id: string, similarity: number, snippet: string): RagMatch => ({ id, similarity, label: 'phishing', snippet });

describe('Reranker', () => {
  it('should tokenize without diacritics and drop filler words', () => {
    expect([...tokenize('Tài khoản của bạn bị khóa')]).toEqual(['tai', 'khoan', 'bi', 'khoa']);
  });

  it('should compute the overlap coefficient', () => {
    expect(lexicalOverlap(new Set(['a1', 'b2']), new Set(['a1', 'c3', 'd4']))).toBe(0.5);
    expect(lexicalOverlap(new Set(), new Set(['x']))).toBe(0);
  });

  it('should move a sample that shares concrete words ahead of a vaguer one', () => {
    const query = 'Tài khoản ngân hàng bị khóa, nhập mã OTP để mở khóa';
    const ranked = rerankMatches(
      query,
      [
        match('vague', 0.82, 'Chúc mừng bạn trúng thưởng xe máy'),
        match('close', 0.8, 'Tài khoản bị khóa, vui lòng nhập mã OTP để mở khóa'),
      ],
      2
    );
    expect(ranked.map(m => m.id)).toEqual(['close', 'vague']);
    expect(ranked[0]!.rerank_score).toBeGreaterThan(ranked[1]!.rerank_score);
  });

  it('should keep only topK matches', () => {
    const many = Array.from({ length: 12 }, (_, i) => match(String(i), 0.5 + i / 100, `mau ${i}`));
    expect(rerankMatches('mau', many, 5)).toHaveLength(5);
  });

  it('should fall back to vector similarity when nothing overlaps', () => {
    const ranked = rerankMatches('xyz', [match('a', 0.6, 'aaa bbb'), match('b', 0.9, 'ccc ddd')], 2);
    expect(ranked.map(m => m.id)).toEqual(['b', 'a']);
  });

  it('should keep the original similarity on each match', () => {
    const ranked = rerankMatches('abc', [match('a', 0.77, 'abc')], 1);
    expect(ranked[0]!.similarity).toBe(0.77);
  });
});
