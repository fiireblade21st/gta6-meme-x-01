// gta6-meme-x-01 — entrypoint for the "Post a GTA 6 meme on X" bounty.
//
// The entry is the X post itself: meme.png (a skeleton gamer who waited
// 13 years for GTA 6, while the make.fun ghost reminds him his AI agent
// already got paid on make.fun), posted from @vash_de_stmp with the
// bounty link, @makefunai, and play code makefun-sapling-scarf-cartoon
// in its text. POST.json names that post; the house reads the post from
// X (its first picture and its text) and hands it to the judge.
//
// What this program does (Node 22+, standard library only, no network):
//   1. checks the entry is complete — POST.json parses and names a live
//      POSTED post with the image attached, caption.txt is non-empty and
//      carries the play code, meme.png is a real PNG;
//   2. builds a self-contained preview in the output directory: POST.json
//      (the gate reads it from here), meme.png, caption.txt, and a
//      preview.html page that shows the meme, the caption, and a link
//      to the live post;
//   3. prints a one-line summary of the entry.
//
// Outside the grader's container, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR
// stand in for /bot and /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
// Add --serve to also serve the preview on http://localhost:8080
// (use --port=N for another port), or --verify to only run the checks
// and exit without writing anything.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PLAY_CODE = 'makefun-sapling-scarf-cartoon';
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function dirFromEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? fallback : value;
}

function fail(message: string): never {
  console.error(`gta6-meme-x-01: ${message}`);
  process.exit(1);
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

interface PostRecord {
  url: string;
  handle: string;
  status: string;
  image_attached: boolean;
  posted_at: string;
}

function readPost(botDir: string): PostRecord {
  const postPath = join(botDir, 'POST.json');
  if (!existsSync(postPath)) fail(`POST.json missing in ${botDir}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(postPath, 'utf8'));
  } catch (err) {
    fail(`POST.json does not parse: ${(err as Error).message}`);
  }
  const post = parsed as Partial<PostRecord>;
  if (typeof post.url !== 'string' || !post.url.startsWith('https://x.com/')) {
    fail('POST.json url is not an x.com post address');
  }
  if (post.status !== 'POSTED') fail(`POST.json status is ${post.status ?? 'missing'}, expected POSTED`);
  if (post.image_attached !== true) fail('POST.json says no image is attached to the post');
  if (typeof post.handle !== 'string' || post.handle === '') fail('POST.json handle is missing');
  return post as PostRecord;
}

function readCaption(botDir: string): string {
  const captionPath = join(botDir, 'caption.txt');
  if (!existsSync(captionPath)) fail('caption.txt missing');
  const caption = readFileSync(captionPath, 'utf8').trim();
  if (caption === '') fail('caption.txt is empty');
  if (!caption.includes(PLAY_CODE)) fail(`caption.txt does not carry the play code ${PLAY_CODE}`);
  return caption;
}

function checkMeme(botDir: string): number {
  const memePath = join(botDir, 'meme.png');
  if (!existsSync(memePath)) fail('meme.png missing');
  const bytes = readFileSync(memePath);
  if (bytes.length < PNG_MAGIC.length) fail('meme.png is too small to be a PNG');
  for (let i = 0; i < PNG_MAGIC.length; i++) {
    if (bytes[i] !== PNG_MAGIC[i]) fail('meme.png does not start with PNG magic bytes');
  }
  return bytes.length;
}

function previewPage(post: PostRecord, caption: string): string {
  const lines = caption.split('\n').map((line) => escapeHtml(line)).join('<br>\n');
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"><title>GTA 6 meme — 13 years waiting</title>',
    '<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:0 1rem;color:#111}img{max-width:100%;height:auto;border-radius:8px}a{color:#1d9bf0}</style>',
    '</head>',
    '<body>',
    '<h1>13 years waiting for GTA 6</h1>',
    '<p><img src="meme.png" alt="Skeleton gamer waiting 13 years for GTA 6"></p>',
    `<p>${lines}</p>`,
    `<p>Posted by <strong>@${escapeHtml(post.handle)}</strong> on <a href="${escapeHtml(post.url)}">X</a> — ${escapeHtml(post.posted_at)}</p>`,
    '<p>Entry for the make.fun bounty <a href="https://make.fun/bounty/gta6-meme-x-01">gta6-meme-x-01</a>.</p>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

function build(botDir: string, outputDir: string): { post: PostRecord; caption: string; memeBytes: number } {
  const post = readPost(botDir);
  const caption = readCaption(botDir);
  const memeBytes = checkMeme(botDir);

  mkdirSync(outputDir, { recursive: true });
  copyFileSync(join(botDir, 'POST.json'), join(outputDir, 'POST.json'));
  copyFileSync(join(botDir, 'meme.png'), join(outputDir, 'meme.png'));
  writeFileSync(join(outputDir, 'caption.txt'), caption + '\n', 'utf8');
  writeFileSync(join(outputDir, 'preview.html'), previewPage(post, caption), 'utf8');
  return { post, caption, memeBytes };
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

async function serveOutputDir(outputDir: string, port: number): Promise<void> {
  const { createServer } = await import('node:http');
  const { extname, resolve, sep } = await import('node:path');
  const root = resolve(outputDir);
  const server = createServer((req, res) => {
    let relPath: string;
    try {
      relPath = decodeURIComponent(req.url ?? '/').split('?')[0];
    } catch {
      res.writeHead(400, { 'content-type': 'text/plain' });
      res.end('bad request');
      return;
    }
    if (relPath === '/') relPath = '/preview.html';
    const filePath = resolve(root, relPath.replace(/^\/+/, ''));
    if (filePath !== root && !filePath.startsWith(root + sep)) {
      res.writeHead(403, { 'content-type': 'text/plain' });
      res.end('forbidden');
      return;
    }
    let data: Buffer;
    try {
      data = readFileSync(filePath);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream' });
    res.end(data);
  });
  await new Promise<void>((done) => {
    server.listen(port, () => {
      console.log(`serving the meme preview at http://localhost:${port}/ (Ctrl-C to stop)`);
      done();
    });
  });
  await new Promise<void>(() => {});
}

function parseFlags(args: string[]): { serve: boolean; verify: boolean; port: number } {
  let serve = false;
  let verify = false;
  let port = 8080;
  for (const arg of args) {
    if (arg === '--serve') serve = true;
    else if (arg === '--verify') verify = true;
    else if (arg.startsWith('--port=')) {
      const value = Number(arg.slice('--port='.length));
      if (!Number.isInteger(value) || value < 1 || value > 65535) fail(`bad --port value: ${arg}`);
      port = value;
    } else {
      fail(`unknown flag: ${arg} (known flags: --serve, --verify, --port=N)`);
    }
  }
  if (serve && verify) fail('--serve and --verify cannot be combined');
  return { serve, verify, port };
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const outputDir = dirFromEnv('MAKEFUN_OUTPUT_DIR', '/output');
  const botDir = dirFromEnv('MAKEFUN_BOT_DIR', '/bot');

  if (flags.verify) {
    const post = readPost(botDir);
    const caption = readCaption(botDir);
    const memeBytes = checkMeme(botDir);
    console.log(`entry checks out: ${post.url} (@${post.handle}, ${memeBytes} byte PNG, caption carries ${PLAY_CODE})`);
    return;
  }

  const { post, caption, memeBytes } = build(botDir, outputDir);
  const captionLines = caption.split('\n').length;
  console.log(`meme ready: ${post.url} (@${post.handle}, ${memeBytes} byte PNG, ${captionLines} caption lines) -> ${outputDir}`);
  if (flags.serve) await serveOutputDir(outputDir, flags.port);
}

main();
