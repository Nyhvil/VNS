import * as fs from 'fs';
import * as path from 'path';

/**
 * The standalone server answers the same addresses as the Supabase Edge
 * Functions, so it uses the same request/response code. Edge functions cannot
 * import from outside their folder, hence the copies; this test keeps them
 * from drifting apart.
 */
describe('code shared with the edge functions', () => {
  const repoRoot = path.join(__dirname, '../../../..');

  it.each([
    ['pipeline-client.ts', 'supabase/functions/analyze-content/pipeline-client.ts'],
    ['chat-core.ts', 'supabase/functions/scam-chat/chat-core.ts'],
  ])('should keep web/%s identical to %s', (ours, theirs) => {
    const edgeCopy = path.join(repoRoot, theirs);
    if (!fs.existsSync(edgeCopy)) return; // pipeline checked out on its own

    const normalise = (text: string) => text.replace(/\r\n/g, '\n');
    expect(normalise(fs.readFileSync(path.join(__dirname, '../../web', ours), 'utf8'))).toBe(
      normalise(fs.readFileSync(edgeCopy, 'utf8'))
    );
  });
});
