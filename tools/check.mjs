#!/usr/bin/env node
// Checks activities.json before the site is deployed.
//   node tools/check.mjs            full check, including that every URL answers HTTP 200
//   node tools/check.mjs --offline  skip the network check
// Exits with code 1 if anything is wrong. Needs Node 18 or newer (built-in fetch). No packages.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const offline = process.argv.includes('--offline');
const errors = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);

const REQUIRED = {
  id: 'string', title: 'string', description: 'string', category: 'string', url: 'string',
  thumbnail: 'string', devices: 'array', controls: 'array', noTimer: 'boolean', needsSound: 'boolean',
  pcOnly: 'boolean', hasOnline: 'boolean', enabled: 'boolean',
};
const DEVICES = ['computer', 'tablet', 'phone'];
const BANNED = /\b(games?|gaming|play(ing)?|arcade|fun|unblocked)\b/i;

let list;
try {
  list = JSON.parse(readFileSync(join(root, 'activities.json'), 'utf8'));
} catch (e) {
  console.error(`activities.json could not be read: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(list) || list.length === 0) {
  console.error('activities.json must be a non-empty array');
  process.exit(1);
}

const seen = new Set();
list.forEach((a, i) => {
  const id = a && typeof a.id === 'string' && a.id ? a.id : `entry #${i + 1}`;
  for (const [key, type] of Object.entries(REQUIRED)) {
    const v = a[key];
    const ok = type === 'array' ? Array.isArray(v) : typeof v === type;
    if (!ok) fail(id, `"${key}" is missing or is not a ${type}`);
    else if (type === 'string' && !v.trim()) fail(id, `"${key}" is empty`);
  }
  if (typeof a.id === 'string') {
    if (!/^[a-z0-9-]+$/.test(a.id)) fail(id, '"id" must use only lowercase letters, numbers and dashes');
    if (seen.has(a.id)) fail(id, 'duplicate "id"');
    seen.add(a.id);
  }
  if (typeof a.url === 'string' && !/^https:\/\//.test(a.url)) fail(id, '"url" must start with https://');
  if (Array.isArray(a.devices)) {
    if (!a.devices.length) fail(id, '"devices" is empty');
    a.devices.filter(d => !DEVICES.includes(d)).forEach(d => fail(id, `unknown device "${d}" (use ${DEVICES.join(', ')})`));
    if (a.pcOnly === true && a.devices.some(d => d !== 'computer')) fail(id, '"pcOnly" is true but "devices" lists more than computer');
  }
  if (Array.isArray(a.controls)) {
    if (!a.controls.length) fail(id, '"controls" is empty');
    a.controls.forEach((c, j) => {
      if (!c || typeof c.action !== 'string' || typeof c.how !== 'string') fail(id, `controls[${j}] needs "action" and "how" text`);
    });
  }
  if (a.hasOnline === true && !(typeof a.onlineNote === 'string' && a.onlineNote.trim())) fail(id, '"hasOnline" is true, so add an "onlineNote" explaining the online features');
  if (typeof a.thumbnail === 'string') {
    if (/^https?:/i.test(a.thumbnail)) fail(id, '"thumbnail" must be a file in assets/thumbs/, not a web address');
    const p = join(root, a.thumbnail);
    if (!existsSync(p)) fail(id, `thumbnail file not found: ${a.thumbnail}`);
    else if (statSync(p).size > 80 * 1024) fail(id, `thumbnail is over 80 KB (${Math.round(statSync(p).size / 1024)} KB); resize it to 640x360 WebP`);
  }
  for (const key of ['title', 'description', 'category']) {
    if (typeof a[key] === 'string' && BANNED.test(a[key])) fail(id, `"${key}" uses a word the site avoids: "${a[key].match(BANNED)[0]}"`);
  }
});

async function checkUrl(a) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(a.url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'activities-check' } });
      if (res.status === 200) return;
      if (attempt === 3) fail(a.id, `${a.url} returned HTTP ${res.status}`);
    } catch (e) {
      if (attempt === 3) fail(a.id, `${a.url} could not be reached (${e.cause?.code || e.name})`);
    }
    await new Promise(r => setTimeout(r, 1500 * attempt));
  }
}

if (!offline) {
  await Promise.all(list.filter(a => a && typeof a.url === 'string').map(checkUrl));
}

const on = list.filter(a => a && a.enabled === true).length;
if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) in activities.json:\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✓ activities.json is fine: ${list.length} activities (${on} switched on)${offline ? ', URLs not checked (--offline)' : ', every URL answered HTTP 200'}.`);
