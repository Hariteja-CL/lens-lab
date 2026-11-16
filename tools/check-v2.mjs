// Quick static checks for the Lens Lab v2 site. Usage (from the repo root): node tools/check-v2.mjs
// Checks: page count, tag balance, internal links and assets resolve, external URLs, duplicate ids,
// one h1 per page, html lang, noindex meta, heading order. Prints seeded deviations so they can be compared with ISSUES.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(SITE);
const html = files.filter((f) => f.endsWith('.html'));
const VOID = new Set(['meta', 'link', 'img', 'input', 'br', 'hr', 'source', 'col', 'area', 'base', 'wbr']);
const SVG_SELF = /\/>$/;
let errors = 0;
const err = (f, m) => { errors++; console.log(`ERROR ${path.relative(SITE, f)}: ${m}`); };
const note = (f, m) => console.log(`note  ${path.relative(SITE, f)}: ${m}`);

function resolveHref(href, fromFile) {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return true; // same-page anchor
  const abs = clean.startsWith('/') ? clean : path.posix.join('/' + path.relative(SITE, path.dirname(fromFile)).replace(/\\/g, '/'), clean);
  const p = path.join(SITE, abs);
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return true;
  if (fs.existsSync(p + '.html')) return true;
  if (fs.existsSync(path.join(p, 'index.html'))) return true;
  return false;
}

console.log(`pages: ${html.length}`);
if (html.length >= 30) err(SITE, '30 or more pages');
let noLang = 0;
for (const f of html) {
  const src = fs.readFileSync(f, 'utf8');
  if (src.includes('\r')) err(f, 'CRLF line endings');
  // tag balance
  const stack = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
  let m;
  const body = src.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '<script></script>');
  while ((m = re.exec(body))) {
    const [all, close, tagRaw] = m; const tag = tagRaw.toLowerCase();
    if (!close && (VOID.has(tag) || SVG_SELF.test(all))) continue;
    if (!close) stack.push(tag);
    else {
      const top = stack.pop();
      if (top !== tag) { err(f, `mismatched </${tag}>, expected </${top}>`); break; }
    }
  }
  if (stack.length) err(f, `unclosed: ${stack.join(', ')}`);
  // links and assets
  for (const [, attr, url] of src.matchAll(/\s(href|src)="([^"]+)"/g)) {
    if (url.startsWith('mailto:')) continue;
    if (/^https?:/.test(url)) { if (url !== 'https://craftlayers.com') err(f, `external URL ${url}`); continue; }
    if (!resolveHref(url, f)) (url.includes('latte-art') ? note(f, `S-10 missing asset ${url}`) : err(f, `broken ${attr} ${url}`));
  }
  for (const [, mail] of src.matchAll(/mailto:([^"]+)/g)) if (!/@([a-z0-9-]+\.)*example\.test$/.test(mail)) note(f, `mailto outside example.test: ${mail}`);
  for (const [, mail] of src.matchAll(/[\s>]([a-z0-9.-]+@[a-z0-9.-]+)/gi)) if (!/example\.test$/.test(mail) && !mail.endsWith('craftlayers.com')) err(f, `email outside example.test: ${mail}`);
  // ids
  const ids = [...src.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) err(f, `duplicate ids ${dup.join(', ')}`);
  // same-page anchors
  for (const [, a] of src.matchAll(/href="#([^"]+)"/g)) if (!ids.includes(a)) err(f, `anchor #${a} has no target`);
  for (const [, a] of src.matchAll(/data-panel="([^"]+)"/g)) if (!ids.includes(a)) err(f, `toggle panel ${a} missing`);
  // h1, lang, robots
  const h1 = (src.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) err(f, `${h1} h1 elements`);
  if (!/<html lang="en">/.test(src)) { noLang++; note(f, 'html has no lang (S-21)'); }
  if (!src.includes('<meta name="robots" content="noindex, nofollow">')) err(f, 'no robots noindex meta');
  if (!src.includes('Fernhollow is a fictional product made to demonstrate CraftLayers Lens. Any resemblance to a real product or company is unintended.')) err(f, 'footer disclaimer missing');
  // heading order
  let prev = 0;
  for (const [, lvl] of src.matchAll(/<h([1-6])[\s>]/g)) { const l = +lvl; if (prev && l > prev + 1) note(f, `heading jumps h${prev} -> h${l}`); prev = l; }
  for (const [img] of src.matchAll(/<img\b[^>]*>/g)) if (!/\salt=/.test(img)) note(f, `img without alt: ${img.slice(0, 60)}`);
  if (/type="time"/.test(src)) err(f, 'native time input');
}
// v2-after fixes S-21, so no page may lack lang there; v2 keeps exactly one (the seed).
const LANG_EXPECTED = process.env.LENSLAB_VARIANT === "v2-after" ? 0 : 1;
if (noLang !== LANG_EXPECTED) err(SITE, `${noLang} pages without lang (expected exactly ${LANG_EXPECTED})`);
console.log(errors ? `${errors} error(s)` : 'no errors');
process.exit(errors ? 1 : 0);
