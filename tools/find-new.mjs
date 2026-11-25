#!/usr/bin/env node
// Looks for new GitHub Pages projects on the accounts listed in site-config.json ("watch")
// and drafts activities.json entries for any that aren't on the site yet.
//
//   node tools/find-new.mjs --list                  just report what's new (no packages needed)
//   node tools/find-new.mjs --write [--body file]   also add entries + thumbnails, and write a
//                                                   pull-request description to "file"
//
// --write needs the packages "playwright" (or "playwright-core") and "sharp" for thumbnails.
// The daily workflow (.github/workflows/new-activities.yml) installs them and opens a pull request.
// Set GITHUB_TOKEN to avoid GitHub's low rate limit for anonymous requests.

import { readFileSync, writeFileSync, appendFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const write = args.includes('--write');
const bodyFile = args.includes('--body') ? args[args.indexOf('--body') + 1] : null;
const token = process.env.GITHUB_TOKEN || '';

const cfg = JSON.parse(readFileSync(join(root, 'site-config.json'), 'utf8'));
const watch = cfg.watch || {};
const accounts = watch.accounts || [];
const ignore = new Set((watch.ignore || []).map(s => s.toLowerCase()));
const list = JSON.parse(readFileSync(join(root, 'activities.json'), 'utf8'));
const norm = u => u.toLowerCase().replace(/\/+$/, '');
const knownUrls = new Set(list.map(a => norm(a.url)));
const ids = new Set(list.map(a => a.id));

async function gh(path, accept = 'application/vnd.github+json') {
  const res = await fetch('https://api.github.com' + path, {
    headers: { accept, 'user-agent': 'activities-scan', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`GitHub ${path}: HTTP ${res.status}`);
  return accept.includes('raw') ? res.text() : res.json();
}
async function getText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'activities-scan' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

// ---- 1. Find Pages projects that aren't on the site ----
const found = [];
for (const account of accounts) {
  const repos = await gh(`/users/${account}/repos?per_page=100&type=owner`);
  for (const r of repos) {
    const name = r.name.toLowerCase();
    if (!r.has_pages || r.fork || r.archived || ignore.has(name) || name === `${account.toLowerCase()}.github.io`) continue;
    let url = `https://${account.toLowerCase()}.github.io/${r.name}/`;
    try { const p = await gh(`/repos/${r.full_name}/pages`); if (p.html_url) url = p.html_url.replace(/\/?$/, '/'); } catch {}
    if (knownUrls.has(norm(url))) continue;
    try { await getText(url); } catch { console.log(`- ${r.full_name}: Pages site isn't live yet, will try again next time`); continue; }
    found.push({ repo: r, url });
  }
}

const out = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
const prettify = n => n.split(/[-_ ]+/).filter(Boolean)
  .map(w => (w.length > 1 && w === w.toUpperCase() ? w[0] + w.slice(1).toLowerCase() : w[0].toUpperCase() + w.slice(1))).join(' ');
const names = found.map(f => clean(prettify(f.repo.name)));
console.log(found.length ? `New: ${found.map(f => f.repo.full_name).join(', ')}` : 'No new activities.');
out('count', found.length);
out('names', names.join(', '));
if (!write || !found.length) process.exit(0);

// ---- 2. Draft an entry for each ----
// Words the site avoids (see tools/check.mjs), swapped for neutral ones.
function clean(s) {
  const swaps = [[/\bgameplay\b/gi, 'activity'], [/\bgames\b/gi, 'activities'], [/\bgame\b/gi, 'activity'], [/\bgaming\b/gi, ''],
    [/\bplaying\b/gi, 'trying'], [/\bplay\b/gi, 'try'], [/\barcade\b/gi, ''], [/\bfun\b/gi, ''], [/\bunblocked\b/gi, '']];
  for (const [re, to] of swaps) s = s.replace(re, m => (to && m[0] === m[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to));
  return s.replace(/\b([Aa]) (activit)/g, '$1n $2').replace(/\s+([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}
const stripMd = s => s.replace(/<[^>]*>?/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[*_`>#]/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s{2,}/g, ' ').trim();
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;
const firstSentences = (s, max = 220) => {
  const parts = s.match(/[^.!?]+[.!?]+/g) || [s];
  let r = '';
  for (const p of parts) { if ((r + p).length > max && r) break; r += p; }
  return r.trim().slice(0, max).trim();
};

function readmeIntro(md) {
  for (const block of md.split(/\n\s*\n/)) {
    const t = block.trim();
    if (!t || /^(#|!\[|\[!\[|<|\||```|---)/.test(t)) continue;
    if (/^[-*] /.test(t)) continue;
    const s = stripMd(t.replace(/\n/g, ' '));
    if (s.length > 25) return s;
  }
  return '';
}

const KEYISH = /arrow|key|space|click|tap|wasd|mouse|drag|swipe|shift|enter|esc|ctrl|scroll|touch|[←→↑↓]|^[a-z0-9]( |$)|^[A-Z]$/i;
function readmeControls(md) {
  const lines = md.split('\n');
  const start = lines.findIndex(l => /^#{1,6}\s*(controls|how to play|how to use|keys|keyboard)/i.test(l));
  if (start < 0) return [];
  const rows = [];
  let lastWasTable = false;
  for (const raw of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(raw)) break;
    let a, b;
    const l = raw.trim();
    if (l.startsWith('|')) {
      if (/^\|[\s:|-]+\|$/.test(l)) { if (lastWasTable) rows.pop(); lastWasTable = false; continue; } // header row
      const cells = l.split('|').slice(1, -1).map(c => stripMd(c)).filter(Boolean);
      if (cells.length < 2) continue;
      [a, b] = cells;
      lastWasTable = true;
    } else {
      const m = l.match(/^[-*+]\s+(.+?)\s+(?:[—–-]|:)\s+(.+)$/) || l.match(/^[-*+]\s+\*\*(.+?)\*\*:?\s*(.+)$/);
      if (!m) continue;
      [a, b] = [stripMd(m[1]).replace(/:$/, ''), stripMd(m[2])];
    }
    if (!a || !b || /^(action|control|key|input)s?$/i.test(a)) continue;
    const [how, action] = KEYISH.test(a) && !KEYISH.test(b) ? [a, b] : KEYISH.test(b) && !KEYISH.test(a) ? [b, a] : [a, b];
    rows.push({ action: clean(action), how: clean(how) });
    if (rows.length >= 8) break;
  }
  return rows;
}

const CATEGORIES = {
  Arena: /shooter|\bfps\b|first-person|deathmatch|\barena\b/g,
  Rhythm: /rhythm|\bbeat|music|\bsong|tempo/g,
  Logic: /puzzle|logic|\bmaze|\bsolve|riddle|sudoku|\bheist/g,
  Strategy: /strateg|turn-based|\bidle\b|conquer|territor|empire|econom|tower defen|\bbuild/g,
  Physics: /physics|gravity|bounc|pinball|\brope|\bswing|momentum|\borbit/g,
  Reflex: /dodge|reflex|runner|\bjump|\brac(e|ing)\b|\bdash|endless/g,
};
function guessCategory(text) {
  let best = 'Reflex', score = 0;
  for (const [cat, re] of Object.entries(CATEGORIES)) {
    const n = (text.match(re) || []).length;
    if (n > score) { best = cat; score = n; }
  }
  return best;
}

function slug(title) {
  let base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'activity';
  let id = base, i = 2;
  while (ids.has(id)) id = `${base}-${i++}`;
  ids.add(id);
  return id;
}

async function draft({ repo, url }) {
  const html = await getText(url);
  const origin = new URL(url).origin;
  let code = html;
  const srcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => new URL(m[1], url)).filter(u => u.origin === origin).slice(0, 10);
  for (const u of srcs) { try { code += '\n' + (await getText(u.href)).slice(0, 3_000_000); } catch {} }
  let readme = '';
  try { readme = await gh(`/repos/${repo.full_name}/readme`, 'application/vnd.github.raw+json'); } catch {}
  const metaDesc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) || [])[1] || '';

  const title = clean(prettify(repo.name));
  const wordy = t => (t || '').replace(/[^a-z]/gi, '').length >= 20;
  const rawDesc = [repo.description, metaDesc, readmeIntro(readme)].find(wordy) || `${title}, a short browser activity.`;
  let description = firstSentences(stripMd(rawDesc).replace(EMOJI, ''));
  // Drop a leading "Title:" or "Title -".
  const rest = description.slice(title.length);
  if (description.toLowerCase().startsWith(title.toLowerCase()) && /^\s*[:—–-]\s+\S/.test(rest)) description = rest.replace(/^\s*[:—–-]\s*/, '');
  description = clean(description).replace(/^./, c => c.toUpperCase());
  // The name and short description count three times as much as the README.
  const short = `${repo.name} ${repo.description || ''} ${metaDesc} `.toLowerCase();
  const category = guessCategory(short.repeat(3) + readme.toLowerCase());

  const touch = /touchstart|ontouchstart|maxTouchPoints|pointerdown|"pointer(down|move)"/.test(code);
  const pointerLock = /requestPointerLock/.test(code);
  const keyboard = /keydown|keyup|keypress/.test(code);
  const mouse = /mousedown|mousemove|"click"|'click'|onclick|pointerdown/.test(code);
  const pcOnly = !touch || (pointerLock && !/touchstart|ontouchstart/.test(code));

  const services = [];
  if (/firebase|firestore/i.test(code)) services.push('Firebase');
  if (/supabase/i.test(code)) services.push('Supabase');
  if (/new WebSocket|socket\.io|wss:\/\//.test(code)) services.push('a live connection');
  if (/RTCPeerConnection|peerjs/i.test(code)) services.push('peer-to-peer');
  const hasOnline = services.length > 0 || /\bonline\b/i.test(readme);
  const chat = hasOnline && /\bchat\b/i.test(code + readme);
  const features = [];
  if (hasOnline && /leaderboard|high[- ]?score table|global (high )?scores?/i.test(readme + code)) features.push('online leaderboards');
  if (hasOnline && /multiplayer|online match|room code|\blobby\b|matchmaking/i.test(readme + code)) features.push('online matches with other people');
  if (chat) features.push('text chat with other players');
  const onlineNote = hasOnline
    ? `Has ${features.length ? features.join(', ').replace(/, ([^,]*)$/, ' and $1') : 'online features'}${services.length ? ` (uses ${services.join(', ')})` : ''}.`
    : '';

  let controls = readmeControls(readme);
  const controlsFrom = controls.length ? 'README' : 'guessed from the code';
  if (!controls.length) {
    if (/Arrow(Left|Right|Up|Down)/.test(code)) controls.push({ action: 'Move', how: /Key[WASD]|["']w["']/.test(code) ? 'Arrow keys or W A S D' : 'Arrow keys' });
    if (/["'] ["']|Space/.test(code) && keyboard) controls.push({ action: 'Main action', how: 'Space' });
    if (pointerLock) controls.push({ action: 'Look around', how: 'Move the mouse (click the screen first)' });
    else if (mouse) controls.push({ action: 'Select / aim', how: 'Mouse' });
    if (!pcOnly) controls.push({ action: 'On a tablet', how: 'Tap or drag on the screen' });
    if (!controls.length) controls.push({ action: 'Start', how: 'Click or tap the screen' });
  }

  const id = slug(title);
  return {
    entry: {
      id, title, description, category, url,
      thumbnail: `assets/thumbs/${id}.webp`,
      devices: pcOnly ? ['computer'] : ['computer', 'tablet', 'phone'],
      inputs: [keyboard && 'keyboard', mouse && 'mouse', !pcOnly && 'touch'].filter(Boolean),
      controls,
      noTimer: false,
      needsSound: category === 'Rhythm',
      pcOnly, hasOnline, onlineNote,
      enabled: !chat,
    },
    notes: { repo: repo.html_url, controlsFrom, chat },
  };
}

// ---- 3. Thumbnails: a 640x360 WebP screenshot of each activity ----
async function thumbnails(entries) {
  let pw;
  try { pw = await import('playwright'); } catch { pw = await import('playwright-core'); }
  const sharp = (await import('sharp')).default;
  const browser = await pw.chromium.launch(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {});
  for (const e of entries) {
    const file = join(root, e.thumbnail);
    let png;
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await page.goto(e.url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(4000);
      png = await page.screenshot();
      await page.close();
    } catch (err) {
      console.log(`- ${e.id}: screenshot failed (${err.message}), using a plain title card`);
      const t = e.title.replace(/[<&>]/g, '');
      png = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="100%" height="100%" fill="#2f4858"/><text x="640" y="380" font-family="sans-serif" font-size="96" fill="#fff" text-anchor="middle">${t}</text></svg>`);
    }
    for (const quality of [72, 55, 40]) {
      await sharp(png).resize(640, 360).webp({ quality }).toFile(file);
      if (statSync(file).size <= 80 * 1024) break;
    }
  }
  await browser.close();
}

const drafts = [];
for (const f of found) drafts.push(await draft(f));
await thumbnails(drafts.map(d => d.entry));
list.push(...drafts.map(d => d.entry));
writeFileSync(join(root, 'activities.json'), JSON.stringify(list, null, 2) + '\n');
console.log(`Added ${drafts.length}: ${drafts.map(d => d.entry.id).join(', ')}`);

if (bodyFile) {
  const yes = b => (b ? 'yes' : 'no');
  const body = [
    `New GitHub Pages projects were found on ${accounts.join(' / ')}, and draft entries were added for them.`,
    '',
    '**Merge this pull request to put them on the site.** The site redeploys on its own after the merge.',
    '',
    'The descriptions, categories and controls are filled in automatically from each project\'s README and code, so please give them a quick look first (open **Files changed**, then the **...** menu on `activities.json`** to edit).',
    '',
    ...drafts.flatMap(({ entry: e, notes: n }) => [
      `### ${e.title}`,
      '',
      `- Project: ${n.repo}`,
      `- Live: ${e.url}`,
      `- Category: **${e.category}** (guessed)`,
      `- Description: ${e.description}`,
      `- Devices: ${e.devices.join(', ')}${e.pcOnly ? ' (computer only)' : ''}`,
      `- Controls: ${n.controlsFrom}`,
      `- Online features: ${e.hasOnline ? e.onlineNote : 'none found'}`,
      `- Switched on after merge: **${yes(e.enabled)}**${n.chat ? ' — it looks like it has **text chat with other players**, so it starts switched off. Set `"enabled": true` for it in `activities.json` to show it.' : ''}`,
      '',
    ]),
    '---',
    'Don\'t want one of these? Delete its entry and thumbnail from this pull request, and add its repository name to `"watch" → "ignore"` in `site-config.json` so it isn\'t suggested again. If you close this pull request without merging, the same projects will be suggested again tomorrow.',
  ].join('\n');
  writeFileSync(bodyFile, body + '\n');
}
