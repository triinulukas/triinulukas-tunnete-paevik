// Generates bundled Estonian voice files for every fixed sentence (TartuNLP Neurokõne).
// Only the app's generic sentences are sent — never anything about the child.
// Usage: node scripts/generate-audio.mjs   (macOS: uses afconvert to make small .m4a files)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { speakableTexts, textHash, TTS_SPEAKER } from '../logic.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'audio');
const TMP = mkdtempSync(join(tmpdir(), 'tts-'));
mkdirSync(OUT, { recursive: true });

const texts = speakableTexts();
const wanted = new Set(texts.map(textHash));

for (const text of texts) {
  const h = textHash(text);
  const file = join(OUT, `${h}.m4a`);
  if (existsSync(file)) continue;
  const res = await fetch('https://api.tartunlp.ai/text-to-speech/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speaker: TTS_SPEAKER, speed: 0.95 }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status} for: ${text}`);
  const wav = join(TMP, `${h}.wav`);
  writeFileSync(wav, Buffer.from(await res.arrayBuffer()));
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '48000', wav, file]);
  console.log(`✓ ${h} ${text}`);
}

// Remove files for sentences that no longer exist, then write the index the app reads.
for (const f of readdirSync(OUT)) {
  if (f.endsWith('.m4a') && !wanted.has(f.slice(0, -4))) { unlinkSync(join(OUT, f)); console.log(`✗ removed ${f}`); }
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify([...wanted].sort()));
console.log(`${wanted.size} sentences ready in audio/`);
