// Generates the Lens Lab v2 (Fernhollow) pages into site/.
// Usage (from the repo root): node tools/gen-v2.mjs
// Fernhollow is fictional. Seeded issues are marked "S-xx" in comments here and mapped in ISSUES.md.
// Plain Node, no dependencies. Output is deterministic (no dates, no randomness).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');

// ---------- helpers ----------
const r1 = (n) => Math.round(n * 10) / 10;
const inr = (n) => '₹' + n.toLocaleString('en-IN');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function table({ caption, head, rows, region = true, num = [], cls = '', firstColHeader = true, emptyFirstHead = false }) {
  const th = head.map((h, i) => (emptyFirstHead && i === 0 ? '<th></th>' : `<th scope="col"${num.includes(i) ? ' class="num"' : ''}>${h}</th>`)).join('');
  const body = rows.map((r) => {
    const attrs = r.attrs ? ' ' + r.attrs : '';
    const cells = (r.cells || r).map((c, i) => {
      if (i === 0 && firstColHeader) return `<th scope="row">${c}</th>`;
      return `<td${num.includes(i) ? ' class="num"' : ''}>${c}</td>`;
    }).join('');
    return `<tr${attrs}>${cells}</tr>`;
  }).join('\n');
  const t = `<table${cls ? ` class="${cls}"` : ''}>\n<caption>${caption}</caption>\n<thead><tr>${th}</tr></thead>\n<tbody>\n${body}\n</tbody>\n</table>`;
  return region ? `<div class="table-scroll" role="region" aria-label="${esc(caption)}" tabindex="0">\n${t}\n</div>` : t;
}

const dataTable = (opts) => `<details>\n<summary>Show the data as a table</summary>\n${table(opts)}\n</details>`;

function axes({ w, h, pad, yMax, ticks = 4, fmt = (v) => v }) {
  let out = '';
  for (let i = 0; i <= ticks; i++) {
    const v = (yMax / ticks) * i;
    const y = r1(h - pad.b - (v / yMax) * (h - pad.t - pad.b));
    out += `<line class="grid-line" x1="${pad.l}" x2="${w - pad.r}" y1="${y}" y2="${y}"></line><text x="${pad.l - 6}" y="${r1(y + 5)}" text-anchor="end">${fmt(v)}</text>`;
  }
  out += `<line class="axis" x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}"></line>`;
  return out;
}

// Vertical bar chart. svgAttrs carries role/aria-label (or nothing, for the seeded S-25 chart).
function barChart({ labels, values, yMax, w = 480, h = 240, barCls = 's1', svgAttrs = '', fmt, showLabels = true, showAxes = true }) {
  const pad = { l: 52, r: 8, t: 12, b: 30 };
  const step = (w - pad.l - pad.r) / values.length;
  const bw = r1(step * 0.6);
  let s = `<svg class="chart" ${svgAttrs} width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
  if (showAxes) s += axes({ w, h, pad, yMax, fmt });
  values.forEach((v, i) => {
    const x = r1(pad.l + step * i + (step - bw) / 2);
    const bh = r1((v / yMax) * (h - pad.t - pad.b));
    s += `<rect class="${barCls}" x="${x}" y="${r1(h - pad.b - bh)}" width="${bw}" height="${bh}"></rect>`;
    if (showLabels) s += `<text x="${r1(x + bw / 2)}" y="${h - 10}" text-anchor="middle">${labels[i]}</text>`;
  });
  return s + '</svg>';
}

function linePoints(values, { w, h, pad, yMin, yMax }) {
  const step = (w - pad.l - pad.r) / (values.length - 1);
  return values.map((v, i) => [r1(pad.l + step * i), r1(h - pad.b - ((v - yMin) / (yMax - yMin)) * (h - pad.t - pad.b))]);
}

// Line / area chart. series: [{ values, cls, area, tips }]
function lineChart({ labels, series, yMin = 0, yMax, w = 520, h = 240, svgAttrs = '', fmt }) {
  const pad = { l: 60, r: 12, t: 12, b: 30 };
  let s = `<svg class="chart" ${svgAttrs} width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
  s += axes({ w, h, pad, yMax, fmt });
  const geo = { w, h, pad, yMin, yMax };
  series.forEach((ser) => {
    const pts = linePoints(ser.values, geo);
    if (ser.area) {
      s += `<path class="${ser.area}" d="M${pts[0][0]} ${h - pad.b} L${pts.map((p) => p.join(' ')).join(' L')} L${pts[pts.length - 1][0]} ${h - pad.b} Z"></path>`;
    }
    s += `<polyline class="${ser.cls}" points="${pts.map((p) => p.join(',')).join(' ')}"></polyline>`;
    if (ser.tips) pts.forEach((p, i) => { s += `<circle class="dot-1" cx="${p[0]}" cy="${p[1]}" r="6" data-tip="${esc(ser.tips[i])}"></circle>`; });
  });
  const step = (w - pad.l - pad.r) / (labels.length - 1);
  labels.forEach((l, i) => { if (l) s += `<text x="${r1(pad.l + step * i)}" y="${h - 10}" text-anchor="middle">${l}</text>`; });
  return s + '</svg>';
}

function stackedBar({ labels, series, yMax, w = 520, h = 260, svgAttrs = '', fmt }) {
  const pad = { l: 52, r: 8, t: 12, b: 30 };
  const step = (w - pad.l - pad.r) / labels.length;
  const bw = r1(step * 0.6);
  let s = `<svg class="chart" ${svgAttrs} width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` + axes({ w, h, pad, yMax, fmt });
  labels.forEach((l, i) => {
    const x = r1(pad.l + step * i + (step - bw) / 2);
    let base = h - pad.b;
    series.forEach((ser) => {
      const bh = r1((ser.values[i] / yMax) * (h - pad.t - pad.b));
      base = r1(base - bh);
      s += `<rect class="${ser.cls}" x="${x}" y="${base}" width="${bw}" height="${bh}"></rect>`;
    });
    s += `<text x="${r1(x + bw / 2)}" y="${h - 10}" text-anchor="middle">${l}</text>`;
  });
  return s + '</svg>';
}

function donut({ parts, svgAttrs, centre }) {
  const r = 60, c = 2 * Math.PI * r, total = parts.reduce((a, p) => a + p.value, 0);
  let off = 0;
  let s = `<svg class="chart" ${svgAttrs} width="200" height="200" viewBox="0 0 200 200"><circle class="ring-track" cx="100" cy="100" r="${r}" stroke-width="28"></circle>`;
  parts.forEach((p) => {
    const len = r1((p.value / total) * c);
    s += `<circle class="${p.cls}" cx="100" cy="100" r="${r}" stroke-width="28" stroke-dasharray="${len} ${r1(c - len)}" stroke-dashoffset="${r1(-off)}" transform="rotate(-90 100 100)"></circle>`;
    off += len;
  });
  if (centre) s += `<text class="gauge-text" x="100" y="110" text-anchor="middle">${centre}</text>`;
  return s + '</svg>';
}

function gauge({ pct, svgAttrs }) {
  const r = 80, half = r1(Math.PI * r), len = r1((pct / 100) * half);
  return `<svg class="chart" ${svgAttrs} width="220" height="130" viewBox="0 0 220 130">`
    + `<path class="ring-track" d="M30 110 A${r} ${r} 0 0 1 190 110" stroke-width="20"></path>`
    + `<path class="gauge-value" d="M30 110 A${r} ${r} 0 0 1 190 110" stroke-width="20" stroke-dasharray="${len} ${half}"></path>`
    + `<text class="gauge-text" x="110" y="105" text-anchor="middle">${pct}%</text>`
    + `<text x="30" y="128" text-anchor="middle">0</text><text x="190" y="128" text-anchor="middle">100</text></svg>`;
}

function scatter({ points, xMax, yMax, svgAttrs, xFmt, yFmt, xTitle, yTitle }) {
  const w = 480, h = 280, pad = { l: 64, r: 12, t: 12, b: 48 };
  let s = `<svg class="chart" ${svgAttrs} width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` + axes({ w, h, pad, yMax, fmt: yFmt });
  for (let i = 0; i <= 4; i++) {
    const v = (xMax / 4) * i, x = r1(pad.l + (v / xMax) * (w - pad.l - pad.r));
    s += `<text x="${x}" y="${h - pad.b + 18}" text-anchor="middle">${xFmt(v)}</text>`;
  }
  s += `<text x="${r1((w + pad.l) / 2)}" y="${h - 6}" text-anchor="middle">${xTitle}</text>`;
  s += `<text x="14" y="${r1(h / 2)}" text-anchor="middle" transform="rotate(-90 14 ${r1(h / 2)})">${yTitle}</text>`;
  points.forEach(([x, y]) => {
    s += `<circle class="dot-1" cx="${r1(pad.l + (x / xMax) * (w - pad.l - pad.r))}" cy="${r1(h - pad.b - (y / yMax) * (h - pad.t - pad.b))}" r="6"></circle>`;
  });
  return s + '</svg>';
}

function heatmap({ rows, cols, values, svgAttrs, max }) {
  const cw = 34, ch = 26, lx = 44, ty = 22;
  const w = lx + cols.length * cw + 4, h = ty + rows.length * ch + 4;
  let s = `<svg class="chart" ${svgAttrs} width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
  cols.forEach((c, j) => { if (j % 2 === 0) s += `<text x="${lx + j * cw + cw / 2}" y="16" text-anchor="middle">${c}</text>`; });
  rows.forEach((r, i) => {
    s += `<text x="${lx - 6}" y="${ty + i * ch + 18}" text-anchor="end">${r}</text>`;
    cols.forEach((c, j) => {
      const lvl = Math.min(4, Math.floor((values[i][j] / (max + 1)) * 5));
      s += `<rect class="heat-${lvl}" x="${lx + j * cw}" y="${ty + i * ch}" width="${cw - 2}" height="${ch - 2}" rx="3"></rect>`;
    });
  });
  return s + '</svg>';
}

function sparkline(values) {
  const w = 160, h = 36, max = Math.max(...values), min = Math.min(...values);
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${r1(i * step)},${r1(h - 4 - ((v - min) / (max - min || 1)) * (h - 8))}`).join(' ');
  return `<svg class="spark" aria-hidden="true" focusable="false" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline class="spark-line" points="${pts}"></polyline></svg>`;
}

const kpi = (label, value, trend, spark) => `<div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-trend">${trend}</p>${spark ? sparkline(spark) : ''}</div>`;

// ---------- page shell ----------
const MAIN_NAV = [['/features', 'Features'], ['/pricing', 'Pricing'], ['/customers', 'Customers'], ['/blog', 'Blog'], ['/help', 'Help'], ['/signin', 'Sign in'], ['/signup', 'Sign up']];
const APP_NAV = [['/app/dashboard', 'Dashboard'], ['/app/schedule', 'Schedule'], ['/app/team', 'Team'], ['/app/reports', 'Reports'], ['/app/time-off', 'Time off'], ['/app/notifications', 'Notifications'], ['/app/settings', 'Settings'], ['/app/billing', 'Billing'], ['/', 'Fernhollow website']];

function navList(items, current) {
  return items.map(([href, label]) => `<li><a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a></li>`).join('\n');
}

function shell({ title, body, route, app = false, noLang = false }) {
  const nav = app
    ? `<nav class="site-nav app-nav" aria-label="App">\n<ul>\n${navList(APP_NAV, route)}\n</ul>\n</nav>`
    : `<nav class="site-nav" aria-label="Main">\n<ul>\n${navList(MAIN_NAV, route)}\n</ul>\n</nav>`;
  return `<!doctype html>
${noLang ? '<html>' : '<html lang="en">'}
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title} · Fernhollow (Lens Lab)</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/styles/tokens.css">
<link rel="stylesheet" href="/styles/base.css">
<link rel="stylesheet" href="/styles/components.css">
<script src="/scripts/lab.js" defer></script>
</head>
<body>
<header>
<div class="lab-bar">Lens Lab: a CraftLayers testing ground. Fernhollow is a fictional product with deliberate design and accessibility flaws.</div>
<div class="site-header">
<a class="logo" href="${app ? '/app/dashboard' : '/'}">Fernhollow${app ? ' <span class="muted">app</span>' : ''}</a>
${nav}
</div>
</header>
<main id="main">
${body.trim()}
</main>
<footer class="site-footer">
<p>Fernhollow is a fictional product made to demonstrate CraftLayers Lens. Any resemblance to a real product or company is unintended.</p>
<ul>
<li><a href="/about">About</a></li>
<li><a href="/changelog">Changelog</a></li>
<li><a href="/privacy">Privacy</a></li>
<li><a href="/help">Help centre</a></li>
<li><a href="/app/dashboard">Open the demo app</a></li>
<li><a href="https://craftlayers.com">CraftLayers</a></li>
</ul>
</footer>
</body>
</html>
`;
}

// ---------- fictional data ----------
const STAFF = [
  { name: 'Meera Iyer', role: 'Shift lead', team: 'barista', cafe: 'Indiranagar', wage: 210, hours: 38, email: 'meera.iyer@example.test' },
  { name: 'Arjun Rao', role: 'Barista', team: 'barista', cafe: 'Indiranagar', wage: 165, hours: 32, email: 'arjun.rao@example.test' },
  { name: 'Kavya Menon', role: 'Barista', team: 'barista', cafe: 'Koramangala', wage: 160, hours: 28, email: 'kavya.menon@example.test' },
  { name: 'Rohan Dsouza', role: 'Cook', team: 'kitchen', cafe: 'Indiranagar', wage: 185, hours: 40, email: 'rohan.dsouza@example.test' },
  { name: 'Ananya Pillai', role: 'Front of house', team: 'floor', cafe: 'Indiranagar', wage: 150, hours: 24, email: 'ananya.pillai@example.test' },
  { name: 'Farhan Sheikh', role: 'Kitchen assistant', team: 'kitchen', cafe: 'Koramangala', wage: 140, hours: 30, email: 'farhan.sheikh@example.test' },
  { name: 'Lakshmi Nair', role: 'Front of house', team: 'floor', cafe: 'Koramangala', wage: 150, hours: 20, email: 'lakshmi.nair@example.test' },
  { name: 'Dev Malhotra', role: 'Barista', team: 'barista', cafe: 'Koramangala', wage: 165, hours: 36, email: 'dev.malhotra@example.test' },
  { name: 'Tara Fernandes', role: 'Cook', team: 'kitchen', cafe: 'Koramangala', wage: 185, hours: 34, email: 'tara.fernandes@example.test' },
  { name: 'Ishaan Kapoor', role: 'Weekend barista', team: 'barista', cafe: 'Indiranagar', wage: 155, hours: 16, email: 'ishaan.kapoor@example.test' },
];
const TEAM_LABEL = { barista: 'Barista', kitchen: 'Kitchen', floor: 'Front of house' };
const DAYS = ['Mon 16', 'Tue 17', 'Wed 18', 'Thu 19', 'Fri 20', 'Sat 21', 'Sun 22'];
const SHIFT_TIMES = { barista: ['06:30–12:30', '12:00–18:00', '14:30–20:30'], kitchen: ['07:00–15:00', '13:00–21:00'], floor: ['08:00–14:00', '15:00–21:00'] };
function shiftFor(si, di) {
  const s = STAFF[si];
  if ((si + di * 3) % 7 === 5 || (si + di) % 7 === 2) return null; // two days off a week
  const times = SHIFT_TIMES[s.team];
  return times[(si + di) % times.length];
}
const WEEKS = ['21 Sep', '28 Sep', '5 Oct', '12 Oct', '19 Oct', '26 Oct', '2 Nov', '9 Nov'];

// ---------- pages ----------
const pages = {};

// Home: S-01, S-02, S-19 (and .promo for S-11, S-14, S-15)
pages['index.html'] = { title: 'Shift planning for small cafés', route: '/', body: `
<h1>Plan café shifts in minutes, not evenings</h1>
<p class="lede">Fernhollow builds a fair weekly rota for your baristas and kitchen team, checks it against everyone's availability, and sends it to their phones.</p>
<p class="promo">New: swap requests now need only one tap.</p>
<img src="/images/cafe-counter.svg" width="480" height="200">
<p>
<a class="btn btn-soft" href="/signup">Start free trial</a>
<button type="button" class="btn btn-ghost">Book a demo</button>
</p>
<section class="section" aria-labelledby="why">
<h2 id="why">Why cafés use Fernhollow</h2>
<div class="grid">
<div class="card"><h3>Fair rotas</h3><p>Opening and closing shifts are shared out evenly across the team.</p></div>
<div class="card"><h3>Availability first</h3><p>Staff mark the hours they can work; the rota respects them.</p></div>
<div class="card"><h3>Live changes</h3><p>Sick call at 6 am? Fernhollow offers the shift to the right people.</p></div>
</div>
</section>
<section class="section" aria-labelledby="numbers">
<h2 id="numbers">In numbers (fictional)</h2>
<div class="kpi-grid">
${kpi('Cafés planning with Fernhollow', '1,240', 'Across 38 cities')}
${kpi('Hours saved per manager each week', '4.5 h', 'Median, based on demo surveys')}
${kpi('Shifts filled within an hour', '87%', 'When a swap is requested')}
</div>
</section>
<section class="section" aria-labelledby="how">
<h2 id="how">How it works</h2>
<ol>
<li>Add your team and their usual availability.</li>
<li>Set how many people you need for each hour of the day.</li>
<li>Press <strong>Build rota</strong>, adjust anything you like, and publish.</li>
</ol>
<blockquote class="quote"><p>“Sunday evenings used to disappear into a spreadsheet. Now the rota is done before my coffee is.”</p><p>Nisha Varma, owner, Kesari Crumb (fictional)</p></blockquote>
<p><a href="/customers">Read more customer stories</a> or <a href="/features">see all features</a>.</p>
</section>` };

pages['features.html'] = { title: 'Features', route: '/features', body: `
<h1>Everything a small café needs to run its rota</h1>
<p class="lede">Fernhollow is built for teams of 5 to 60 people who work early starts, split shifts and busy weekends.</p>
<section class="section" aria-labelledby="f-rota">
<h2 id="f-rota">Rota builder</h2>
<p>Set the cover you need hour by hour. Fernhollow suggests a rota that respects availability, rest breaks and contracted hours, and highlights any gaps in amber before you publish.</p>
</section>
<section class="section" aria-labelledby="f-avail">
<h2 id="f-avail">Availability and time off</h2>
<p>Staff set their availability and request leave from their phones. Managers approve in one place, and approved leave is blocked out of the rota automatically.</p>
</section>
<section class="section" aria-labelledby="f-swap">
<h2 id="f-swap">Swap requests</h2>
<p>When someone cannot make a shift, Fernhollow offers it to qualified teammates who are free, and tells the manager once it is covered.</p>
</section>
<section class="section" aria-labelledby="f-reports">
<h2 id="f-reports">Reports that match the till</h2>
<p>Compare planned hours with worked hours and sales, so you can staff the rush without paying for quiet afternoons.</p>
<figure>
${lineChart({ labels: WEEKS, yMax: 400, fmt: (v) => v + ' h', series: [{ values: [352, 348, 360, 355, 362, 370, 366, 372], cls: 'line-1' }, { values: [340, 351, 349, 361, 368, 362, 371, 369], cls: 'line-2' }], svgAttrs: 'role="img" aria-label="Line chart: planned and worked hours per week at a demo café, 21 September to 9 November. Both lines stay between 340 and 372 hours; worked hours track planned hours within 12 hours every week."' })}
<figcaption>Planned and worked hours per week at a demo café. Worked hours stay within 12 hours of the plan.</figcaption>
</figure>
<ul class="legend">
<li><span class="swatch swatch-solid" aria-hidden="true"></span>Planned hours (solid line)</li>
<li><span class="swatch swatch-dashed" aria-hidden="true"></span>Worked hours (dashed line)</li>
</ul>
${dataTable({ caption: 'Planned and worked hours per week', head: ['Week starting', 'Planned hours', 'Worked hours'], num: [1, 2], region: true, rows: WEEKS.map((w, i) => [w, [352, 348, 360, 355, 362, 370, 366, 372][i], [340, 351, 349, 361, 368, 362, 371, 369][i]]) })}
</section>
<p class="section"><a class="btn btn-primary" href="/pricing">See pricing</a></p>` };

// Pricing: S-03 (Group card CTA), S-04 (Team card), S-05 (comparison table)
pages['pricing.html'] = { title: 'Pricing', route: '/pricing', body: `
<h1>Pricing</h1>
<p>Simple monthly plans, billed in rupees. Prices are fictional.</p>
<div class="grid">
<div class="card">
<h2>Starter</h2>
<p class="plan-price">₹0</p>
<p>One café, up to 8 staff. Rota builder and availability.</p>
<a class="btn" href="/signup?plan=starter">Choose Starter</a>
</div>
<div class="plan-card" role="button" tabindex="0">
<h2>Team</h2>
<p class="plan-price">₹1,200 / month</p>
<p>Up to 3 cafés, unlimited staff, swap requests and reports.</p>
<a class="btn" href="#compare">Compare</a>
</div>
<div class="card">
<h2>Group</h2>
<p class="plan-price">₹4,500 / month</p>
<p>Unlimited cafés, payroll export and a named support contact.</p>
<a class="btn btn-primary" href="/signup?plan=group" aria-label="Select plan">Choose Group</a>
</div>
</div>
<h2 id="compare">Compare plans</h2>
<table class="compare">
<caption>What each plan includes</caption>
<thead><tr><th scope="col">Feature</th><th scope="col">Starter</th><th scope="col">Team</th><th scope="col">Group</th></tr></thead>
<tbody>
<tr><th scope="row">Cafés</th><td>1</td><td>3</td><td>Unlimited</td></tr>
<tr><th scope="row">Staff</th><td>8</td><td>Unlimited</td><td>Unlimited</td></tr>
<tr><th scope="row">Swap requests</th><td>No</td><td>Yes</td><td>Yes</td></tr>
<tr><th scope="row">Time-off approvals</th><td>Yes</td><td>Yes</td><td>Yes</td></tr>
<tr><th scope="row">Reports and labour cost</th><td>Basic</td><td>Full</td><td>Full</td></tr>
<tr><th scope="row">Payroll export</th><td>No</td><td>No</td><td>Yes</td></tr>
<tr><th scope="row">Support</th><td>Help centre</td><td>Email, 1 working day</td><td>Named contact</td></tr>
</tbody>
</table>
<h2>Questions</h2>
<details><summary>Can I change plan later?</summary><p>Yes. Changes take effect from your next invoice.</p></details>
<details><summary>Do you charge per staff member?</summary><p>No. Team and Group include unlimited staff.</p></details>` };

// Customers: S-25 (chart with no text alternative at all)
pages['customers.html'] = { title: 'Customers', route: '/customers', body: `
<h1>Cafés that plan with Fernhollow</h1>
<p>Three fictional cafés, three different problems. All names and numbers are invented.</p>
<section class="section panel" aria-labelledby="c-kesari">
<h2 id="c-kesari">Kesari Crumb, Pune</h2>
<p>A bakery café with 14 staff and a 6 am opening. The owner used to build the rota by hand every Sunday.</p>
<blockquote class="quote"><p>“Sunday evenings used to disappear into a spreadsheet. Now the rota is done before my coffee is.”</p><p>Nisha Varma, owner</p></blockquote>
<p>Result: rota time down from 3 hours to 25 minutes a week.</p>
</section>
<section class="section panel" aria-labelledby="c-bluepine">
<h2 id="c-bluepine">Bluepine Brew Room, Shillong</h2>
<p>Two sites and a lot of weekend overtime. Fernhollow's cover targets showed where extra people were booked on quiet afternoons.</p>
<h3>Overtime hours per month, before and after Fernhollow</h3>
${barChart({ labels: [], values: [64, 58, 61, 55, 31, 26, 22, 19], yMax: 70, barCls: 's1', showLabels: false, showAxes: false, svgAttrs: '' })}
<blockquote class="quote"><p>“We stopped guessing. The rush is covered and the quiet hours are not.”</p><p>Daniel Lyngdoh, operations lead</p></blockquote>
</section>
<section class="section panel" aria-labelledby="c-saffron">
<h2 id="c-saffron">Saffron Steps Coffee, Jaipur</h2>
<p>Students on changing timetables. Availability updates from phones replaced a wall calendar and a group chat.</p>
<blockquote class="quote"><p>“Swaps happen in minutes, and I only hear about them when they are done.”</p><p>Ritika Shekhawat, manager</p></blockquote>
<p>Result: 9 in 10 swap requests filled without the manager stepping in.</p>
</section>` };

// Blog
pages['blog/index.html'] = { title: 'Blog', route: '/blog', body: `
<h1>Fernhollow blog</h1>
<p>Practical notes on running a café team. Written by fictional café owners and the Fernhollow team.</p>
<ul class="notice-list">
<li><h2><a href="/blog/peak-hours">Staffing the morning rush without overstaffing the afternoon</a></h2><p class="post-meta"><time datetime="2026-11-04">4 November 2026</time> · 5 minute read</p><p>How to read your till data hour by hour and turn it into cover targets.</p></li>
<li><h2><a href="/blog/rota-tips">Five rota tips for a calmer café week</a></h2><p class="post-meta"><time datetime="2026-10-12">12 October 2026</time> · 4 minute read</p><p>Small changes that make the week fairer for everyone on the team.</p></li>
</ul>` };

// S-06 (h1 then h3), S-10 (missing image)
pages['blog/rota-tips.html'] = { title: 'Five rota tips for a calmer café week', route: '/blog', body: `
<article>
<h1>Five rota tips for a calmer café week</h1>
<p class="post-meta"><time datetime="2026-10-12">12 October 2026</time> · 4 minute read</p>
<p>Small cafés live and die by the morning rush. These tips come from fictional café owners.</p>
<img src="/images/latte-art.svg" alt="A latte with a fern pattern in the foam" width="480" height="270">
${['Publish the rota a week ahead|People plan their lives around it; two days of notice is not enough.', 'Rotate the opening shift|Nobody should open six days in a row.', 'Keep one floating shift|A flexible person on Friday afternoon saves the weekend.', 'Pair new starters with a shift lead|Their first three shifts should overlap with someone experienced.', 'Review the rota against the till|If Tuesday afternoons are quiet, say so in your cover targets.']
    .map((s, i) => { const [h, p] = s.split('|'); return `<h3>${i + 1}. ${h}</h3>\n<p>${p}</p>`; }).join('\n')}
</article>` };

const COVERS = [12, 34, 58, 61, 44, 38, 52, 47, 29, 22, 26, 31, 18];
const HOURS_LBL = ['7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'];
pages['blog/peak-hours.html'] = { title: 'Staffing the morning rush', route: '/blog', body: `
<article>
<h1>Staffing the morning rush without overstaffing the afternoon</h1>
<p class="post-meta"><time datetime="2026-11-04">4 November 2026</time> · 5 minute read</p>
<p>Most cafés know their busy hours by feel. Writing them down as numbers makes the rota easier to defend and easier to change.</p>
<h2>Start with covers per hour</h2>
<p>Export a month of till receipts and count how many orders start in each hour. Here is a typical weekday at a fictional 40-seat café.</p>
<figure>
${barChart({ labels: HOURS_LBL, values: COVERS, yMax: 70, svgAttrs: 'role="img" aria-label="Bar chart: average orders per hour on a weekday, 7:00 to 19:00. Orders peak at 61 at 10:00, dip to 38 at 12:00, rise to 52 at 13:00, and fall to 18 by 19:00."' })}
<figcaption>Average orders per hour on a weekday. Hours are the start of each hour, from 7:00 to 19:00.</figcaption>
</figure>
${dataTable({ caption: 'Average orders per hour on a weekday', head: ['Hour', 'Orders'], num: [1], rows: HOURS_LBL.map((h, i) => [h + ':00', COVERS[i]]) })}
<h2>Turn covers into cover targets</h2>
<p>As a starting point, plan one barista for every 20 orders an hour and one person on the floor for every 30. Adjust after two weeks.</p>
<h2>Check it every month</h2>
<p>Menus, seasons and school terms all move the rush. A monthly look at the numbers keeps the rota honest.</p>
</article>` };

// Help
pages['help/index.html'] = { title: 'Help centre', route: '/help', body: `
<h1>Help centre</h1>
<form class="panel panel-surface" role="search" action="/help" method="get" onsubmit="return false">
<div class="field"><label for="help-search">Search help articles</label><input id="help-search" name="q" type="search"></div>
<button type="submit" class="btn btn-primary">Search</button>
</form>
<h2 class="section">Popular article</h2>
<p><a href="/help/swap-requests">How swap requests work</a>: offering a shift, accepting one, and what managers see.</p>
<h2>Frequently asked questions</h2>
<details><summary>How do I add a new team member?</summary><p>Go to Team, choose Invite a teammate, enter their work email and role. They get an invitation by email.</p></details>
<details><summary>Can staff see each other's phone numbers?</summary><p>No. Staff see names and shifts only. Managers can see contact details.</p></details>
<details><summary>What happens when I publish a rota?</summary><p>Everyone on it gets a notification with their shifts for the week. Later changes are sent as updates.</p></details>
<h2>Still stuck?</h2>
<p>Email the demo support team at <a href="mailto:help@fernhollow.example.test">help@fernhollow.example.test</a>. This is a fictional address.</p>` };

pages['help/swap-requests.html'] = { title: 'How swap requests work', route: '/help', body: `
<article>
<h1>How swap requests work</h1>
<p class="post-meta">Help centre · Updated <time datetime="2026-11-10">10 November 2026</time></p>
<p>A swap request lets someone hand a shift to a teammate without the manager rearranging the rota by hand.</p>
<h2>Offer a shift</h2>
<ol>
<li>Open the shift on your phone or in the Schedule.</li>
<li>Choose <strong>Offer this shift</strong> and add a short note if you like.</li>
<li>Fernhollow sends the offer to teammates who have the right role and are free at that time.</li>
</ol>
<h2>Accept a shift</h2>
<p>Choose <strong>Take this shift</strong> on the offer. The first qualified person to accept gets it, and the rota updates for everyone.</p>
<h2>What managers see</h2>
<p>Managers get one notification when the swap is complete. If nobody accepts within 12 hours, the manager is asked to step in.</p>
<h2>Limits</h2>
<ul>
<li>Swaps cannot break rest-break rules or push someone over their contracted hours.</li>
<li>Shifts that start in less than two hours go straight to the manager.</li>
</ul>
<p><a href="/help">Back to the help centre</a></p>
</article>` };

// Clean pages (S-18): about, changelog, privacy, help article, blog index
const CAFES_GROWTH = [180, 260, 340, 450, 590, 720, 860, 1010, 1240];
const Q_LABELS = ['Q1 24', 'Q2 24', 'Q3 24', 'Q4 24', 'Q1 25', 'Q2 25', 'Q3 25', 'Q4 25', 'Q3 26'];
pages['about.html'] = { title: 'About', route: '/about', body: `
<h1>About Fernhollow</h1>
<p>Fernhollow is an invented café-shift planner. It exists only so that CraftLayers Lens has a realistic site to scan.</p>
<h2>What is on this site</h2>
<p>Some pages have deliberate flaws. This page, the blog list, the changelog, the privacy page and the swap-requests help article are meant to be clean.</p>
<h2>Growth (fictional)</h2>
<figure>
${lineChart({ labels: Q_LABELS.map((l, i) => (i % 2 === 0 ? l : '')), yMax: 1400, fmt: (v) => v, series: [{ values: CAFES_GROWTH, cls: 'line-1', area: 'area-1' }], svgAttrs: 'role="img" aria-label="Area chart: cafés using Fernhollow, rising steadily from 180 in the first quarter of 2024 to 1,240 in the third quarter of 2026."' })}
<figcaption>Cafés using Fernhollow at the end of each quarter. All numbers are invented.</figcaption>
</figure>
${dataTable({ caption: 'Cafés using Fernhollow by quarter', head: ['Quarter', 'Cafés'], num: [1], rows: Q_LABELS.map((q, i) => [q, CAFES_GROWTH[i].toLocaleString('en-IN')]) })}` };

pages['changelog.html'] = { title: 'Changelog', route: '/changelog', body: `
<h1>Changelog</h1>
<h2>November 2026</h2>
<h3>Version 2.4</h3>
<ul><li>Swap requests need one tap.</li><li>Rota export to PDF.</li><li>Reports show labour cost as a share of sales.</li></ul>
<h2>October 2026</h2>
<h3>Version 2.3</h3>
<ul><li>Availability calendar for staff.</li><li>Time-off requests can include a note.</li></ul>
<h2>September 2026</h2>
<h3>Version 2.2</h3>
<ul><li>Busiest-hours heatmap on the schedule.</li><li>Invoices list in Billing.</li></ul>` };

pages['privacy.html'] = { title: 'Privacy', route: '/privacy', body: `
<h1>Privacy</h1>
<p>This demo site has no accounts, sends no forms and sets no cookies. Vercel, the host, keeps standard access logs.</p>
<h2>Demo data</h2>
<p>Every café, person, shift, wage and invoice on this site is invented. Email addresses use the reserved example.test domain.</p>
<h2>Contact</h2>
<p>Questions about this demo: <a href="mailto:support@craftlayers.com">support@craftlayers.com</a>.</p>` };

// Sign up: S-08, S-09
pages['signup.html'] = { title: 'Create your account', route: '/signup', body: `
<h1>Create your Fernhollow account</h1>
<p>This form is a demo: nothing is sent or stored.</p>
<form action="/signup" method="get" onsubmit="return false">
<div class="field"><label for="name">Your name</label><input id="name" name="name" type="text" autocomplete="off"></div>
<div class="field"><label for="email">Work email</label><input id="email" name="email" type="email"></div>
<div class="field"><label for="phone">Phone</label><input id="phone" name="phone" type="tel" autocomplete="off"></div>
<div class="field"><label for="cafe-name">Café name</label><input id="cafe-name" name="cafe-name" type="text" autocomplete="organization"></div>
<div class="field"><input name="team-size" type="number" min="1"></div>
<div class="field"><input name="tills" type="number" min="1" placeholder="Number of tills"></div>
<div class="field"><label for="plan">Plan</label><select id="plan" name="plan"><option>Starter</option><option>Team</option><option>Group</option></select></div>
<button type="submit" class="btn btn-primary">Create account</button>
</form>
<p>Already have an account? <a href="/signin">Sign in</a>.</p>` };

pages['signin.html'] = { title: 'Sign in', route: '/signin', body: `
<h1>Sign in to Fernhollow</h1>
<p>This form is a demo: nothing is sent or stored. To look around, <a href="/app/dashboard">open the demo app</a>.</p>
<form action="/signin" method="get" onsubmit="return false">
<div class="field"><label for="signin-email">Work email</label><input id="signin-email" name="email" type="email" autocomplete="email"></div>
<div class="field"><label for="signin-password">Password</label><input id="signin-password" name="password" type="password" autocomplete="current-password"></div>
<div class="check"><input id="remember" name="remember" type="checkbox"><label for="remember">Keep me signed in on this device</label></div>
<button type="submit" class="btn btn-primary">Sign in</button>
</form>
<p><a href="/help">Forgot your password? Visit the help centre.</a></p>
<p>New to Fernhollow? <a href="/signup">Create an account</a>.</p>` };

// ---------- app pages ----------
const COVERED = [11, 12, 10, 13, 14, 15, 9];
// Dashboard: S-07 (empty header cell), S-17 (svg role=img, no name), S-21 (no lang)
pages['app/dashboard.html'] = { app: true, noLang: true, title: 'Dashboard', route: '/app/dashboard', body: `
<h1>This week at Fernhollow Café, Indiranagar (demo data)</h1>
<p class="stat">42 shifts planned · 3 open · 2 swap requests</p>
<h2>At a glance</h2>
<div class="kpi-grid">
${kpi('Shifts planned', '42', 'Up 4 on last week', [36, 38, 37, 40, 38, 41, 38, 42])}
${kpi('Hours scheduled', '318 h', 'Up 12 h on last week', [290, 302, 298, 310, 296, 312, 306, 318])}
${kpi('Labour cost', inr(48760), '24% of forecast sales', [45200, 46100, 45800, 47900, 46300, 48100, 47400, 48760])}
${kpi('Swap requests', '2', '1 waiting for a teammate', [5, 3, 4, 2, 6, 3, 1, 2])}
</div>
<h2 class="section">Shifts covered per day</h2>
<svg role="img" width="320" height="160" viewBox="0 0 320 160">
${COVERED.map((v, i) => `<rect class="chart-bar" x="${10 + i * 45}" y="${140 - v * 8}" width="30" height="${v * 8}"></rect><text x="${25 + i * 45}" y="156" text-anchor="middle">${DAYS[i].slice(0, 3)}</text>`).join('\n')}
</svg>
<h2 class="section">Shifts by role</h2>
<div class="range" role="group" aria-label="Week shown" data-toggle-group>
<button type="button" aria-pressed="true" data-panel="mix-this">This week</button>
<button type="button" aria-pressed="false" data-panel="mix-next">Next week</button>
</div>
<div id="mix-this">
<figure>
${donut({ parts: [{ value: 18, cls: 'ring-1' }, { value: 14, cls: 'ring-3' }, { value: 10, cls: 'ring-2' }], centre: '42', svgAttrs: 'role="img" aria-label="Donut chart: 42 shifts this week. Barista 18, kitchen 14, front of house 10."' })}
<figcaption>42 shifts this week.</figcaption>
</figure>
<ul class="legend">
<li><span class="swatch swatch-1" aria-hidden="true"></span>Barista: 18 shifts (43%)</li>
<li><span class="swatch swatch-3" aria-hidden="true"></span>Kitchen: 14 shifts (33%)</li>
<li><span class="swatch swatch-2" aria-hidden="true"></span>Front of house: 10 shifts (24%)</li>
</ul>
</div>
<div id="mix-next" hidden>
<figure>
${donut({ parts: [{ value: 17, cls: 'ring-1' }, { value: 15, cls: 'ring-3' }, { value: 8, cls: 'ring-2' }], centre: '40', svgAttrs: 'role="img" aria-label="Donut chart: 40 shifts next week. Barista 17, kitchen 15, front of house 8."' })}
<figcaption>40 shifts next week (draft rota).</figcaption>
</figure>
<ul class="legend">
<li><span class="swatch swatch-1" aria-hidden="true"></span>Barista: 17 shifts (43%)</li>
<li><span class="swatch swatch-3" aria-hidden="true"></span>Kitchen: 15 shifts (37%)</li>
<li><span class="swatch swatch-2" aria-hidden="true"></span>Front of house: 8 shifts (20%)</li>
</ul>
</div>
<h2 class="section">Rota coverage</h2>
<figure>
${gauge({ pct: 92, svgAttrs: 'role="img" aria-label="Gauge: 92% of required hours are covered this week."' })}
<figcaption>92% of the hours you asked for are covered. 26 hours are still open.</figcaption>
</figure>
<h2 class="section">Open shifts</h2>
<table>
<caption>Shifts that still need someone</caption>
<thead><tr><th></th><th scope="col">Day</th><th scope="col">Time</th><th scope="col">Role</th></tr></thead>
<tbody>
<tr><td><a href="/app/schedule">Edit</a></td><td>Tuesday</td><td>06:30–12:00</td><td>Barista</td></tr>
<tr><td><a href="/app/schedule">Edit</a></td><td>Friday</td><td>15:00–21:00</td><td>Kitchen</td></tr>
<tr><td><a href="/app/schedule">Edit</a></td><td>Sunday</td><td>08:00–14:00</td><td>Front of house</td></tr>
</tbody>
</table>` };

// Schedule (clean): week grid, role filter, busiest-hours heatmap
const HEAT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HEAT_HOURS = ['7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'];
const HEAT = HEAT_DAYS.map((d, i) => HEAT_HOURS.map((h, j) => {
  const base = [10, 30, 52, 58, 42, 36, 48, 40, 24, 20, 26, 30][j];
  const dayBoost = [0, -4, -2, 0, 6, 18, 14][i];
  return Math.max(4, base + dayBoost + ((i * 7 + j * 3) % 5));
}));
const HEAT_MAX = Math.max(...HEAT.flat());
const scheduleRows = STAFF.map((s, si) => [
  s.name + `<br><span class="muted">${s.role}</span>`,
  ...DAYS.map((d, di) => { const t = shiftFor(si, di); return t ? `<span class="shift${s.team === 'kitchen' ? ' shift-kitchen' : s.team === 'floor' ? ' shift-floor' : ''}" data-role="${s.team}">${t} · ${TEAM_LABEL[s.team]}</span>` : '<span class="muted">Off</span>'; }),
]);
const shiftCount = STAFF.reduce((a, s, si) => a + DAYS.filter((d, di) => shiftFor(si, di)).length, 0);
pages['app/schedule.html'] = { app: true, title: 'Schedule', route: '/app/schedule', body: `
<h1>Rota: week of 16 November 2026</h1>
<p>Fernhollow Café, Indiranagar and Koramangala (demo data). Rota published on 12 November.</p>
<div class="field"><label for="role-filter">Show shifts for</label><select id="role-filter" name="role-filter"><option value="all">All roles</option><option value="barista">Barista</option><option value="kitchen">Kitchen</option><option value="floor">Front of house</option></select></div>
<p id="role-filter-status" role="status">Showing ${shiftCount} shifts.</p>
${table({ caption: 'Shifts for the week of 16 to 22 November', head: ['Team member', ...DAYS], rows: scheduleRows, cls: 'schedule' })}
<p class="muted">Each shift shows its time and role. Kitchen shifts have a rust edge, front-of-house shifts a blue edge, barista shifts a green edge; the role is always written out as well.</p>
<h2 class="section">Busiest hours</h2>
<figure>
${heatmap({ rows: HEAT_DAYS, cols: HEAT_HOURS, values: HEAT, max: HEAT_MAX, svgAttrs: 'role="img" aria-label="Heatmap: average orders by day and hour over the last four weeks. Saturday and Sunday mornings from 9:00 to 11:00 are the busiest; 7:00 on weekdays is the quietest, and weekday afternoons from 15:00 to 16:00 are also quiet."' })}
<figcaption>Average orders by day and hour, last four weeks. Darker squares mean more orders. Hours run from 7:00 to 18:00.</figcaption>
</figure>
${dataTable({ caption: 'Average orders by day and hour', head: ['Day', ...HEAT_HOURS.map((h) => h + ':00')], num: HEAT_HOURS.map((h, i) => i + 1), rows: HEAT_DAYS.map((d, i) => [d, ...HEAT[i]]) })}` };

// Team (clean)
pages['app/team.html'] = { app: true, title: 'Team', route: '/app/team', body: `
<h1>Team</h1>
<p>${STAFF.length} people across two cafés (demo data). Wages are hourly and fictional.</p>
${table({ caption: 'Team members', head: ['Name', 'Role', 'Café', 'Hourly wage', 'Hours this week', 'Email'], num: [3, 4], rows: STAFF.map((s) => [s.name === 'Meera Iyer' ? `<a href="/app/team/meera-iyer">${s.name}</a>` : s.name, s.role, s.cafe, inr(s.wage), s.hours, s.email]) })}
<p>Open <a href="/app/team/meera-iyer">Meera Iyer's profile</a> to see an example team member page.</p>
<h2 class="section">Invite a teammate</h2>
<form class="panel panel-surface" onsubmit="return false">
<div class="field"><label for="invite-email">Work email</label><input id="invite-email" name="invite-email" type="email" autocomplete="off"></div>
<div class="field"><label for="invite-role">Role</label><select id="invite-role" name="invite-role"><option>Barista</option><option>Kitchen</option><option>Front of house</option><option>Shift lead</option></select></div>
<button type="submit" class="btn btn-primary">Send invitation</button>
</form>` };

const MEERA_HOURS = [36, 38, 40, 34, 38, 37, 39, 38];
pages['app/team/meera-iyer.html'] = { app: true, title: 'Meera Iyer', route: '/app/team', body: `
<p><a href="/app/team">Back to team</a></p>
<h1><span class="avatar" aria-hidden="true">MI</span> Meera Iyer</h1>
<dl>
<dt>Role</dt><dd>Shift lead and barista</dd>
<dt>Café</dt><dd>Fernhollow Café, Indiranagar</dd>
<dt>Started</dt><dd>March 2024</dd>
<dt>Hourly wage</dt><dd>${inr(210)}</dd>
<dt>Email</dt><dd>meera.iyer@example.test</dd>
</dl>
<h2>Hours worked, last 8 weeks</h2>
<figure>
${lineChart({ labels: WEEKS.map((w, i) => (i % 2 === 0 ? w : '')), yMax: 48, fmt: (v) => v + ' h', series: [{ values: MEERA_HOURS, cls: 'line-1' }], svgAttrs: 'role="img" aria-label="Line chart: Meera Iyer worked between 34 and 40 hours each week from 21 September to 9 November, 38 hours in the latest week."' })}
<figcaption>Weekly hours worked. Contracted hours are 38 a week.</figcaption>
</figure>
${dataTable({ caption: 'Hours worked per week', head: ['Week starting', 'Hours'], num: [1], rows: WEEKS.map((w, i) => [w, MEERA_HOURS[i]]) })}
<h2 class="section">Availability</h2>
${table({ caption: 'Usual availability', head: ['Day', 'Morning', 'Afternoon', 'Evening'], rows: HEAT_DAYS.map((d, i) => [d, i === 6 ? 'No' : 'Yes', i % 3 === 2 ? 'No' : 'Yes', i >= 4 ? 'Yes' : 'No']) })}
<h2 class="section">Upcoming shifts</h2>
<ul>
<li>Monday 16 November, 06:30–12:30, barista (opening)</li>
<li>Tuesday 17 November, 12:00–18:00, shift lead</li>
<li>Thursday 19 November, 06:30–12:30, barista (opening)</li>
<li>Saturday 21 November, 14:30–20:30, shift lead</li>
</ul>` };

// Reports: S-22, S-23, S-24, S-26, S-27
const LABOUR = [44800, 45900, 46300, 45100, 47200, 48900, 47600, 48760];
const ROLE_HOURS = { barista: [150, 148, 156, 152, 160, 158, 162, 164], kitchen: [110, 112, 108, 114, 112, 118, 116, 114], floor: [70, 72, 74, 70, 76, 80, 78, 72] };
const SAT_THIS = [8, 22, 46, 64, 70, 58, 50, 44, 36, 30, 34, 40, 28];
const SAT_LAST = [10, 20, 40, 58, 66, 60, 46, 40, 34, 32, 30, 36, 24];
const DAILY = [[6200, 21000], [6400, 19800], [6100, 22400], [6600, 24100], [7400, 29800], [8800, 38600], [8200, 34900], [6300, 20500], [6500, 23300], [7000, 26700], [7600, 31200], [9100, 40200], [8400, 36100], [6000, 18900]];
pages['app/reports.html'] = { app: true, title: 'Reports', route: '/app/reports', body: `
<h1>Reports</h1>
<p>Fernhollow Café, Indiranagar. Eight weeks to 15 November 2026 (demo data).</p>
<h2>Labour cost per week</h2>
<div class="chart-wrap" data-hover-tip>
${lineChart({ labels: WEEKS.map((w, i) => (i % 2 === 0 ? w : '')), yMin: 0, yMax: 60000, fmt: (v) => '₹' + v / 1000 + 'k', series: [{ values: LABOUR, cls: 'line-1', tips: WEEKS.map((w, i) => `Week of ${w}: ${inr(LABOUR[i])}`) }], svgAttrs: 'role="img" aria-label="Labour cost per week, last 8 weeks"' })}
<div class="chart-tip" hidden></div>
</div>
<p class="chart-source">Source: payroll export, 8 weeks to 15 November 2026. Point at a week to see its exact cost.</p>
<h2 class="section">Hours by role</h2>
<figure>
${stackedBar({ labels: WEEKS.map((w) => w.split(' ')[0]), yMax: 400, fmt: (v) => v + ' h', series: [{ cls: 's3', values: ROLE_HOURS.barista }, { cls: 's1', values: ROLE_HOURS.kitchen }, { cls: 's5', values: ROLE_HOURS.floor }], svgAttrs: 'role="img" aria-label="Stacked bar chart: hours worked per week by role, last 8 weeks."' })}
<figcaption>Hours worked per week, split by role.</figcaption>
</figure>
<ul class="legend">
<li><span class="swatch swatch-3" aria-hidden="true"></span>Barista</li>
<li><span class="swatch swatch-1" aria-hidden="true"></span>Kitchen</li>
<li><span class="swatch swatch-5" aria-hidden="true"></span>Front of house</li>
</ul>
${dataTable({ caption: 'Hours worked per week by role', head: ['Week starting', 'Barista', 'Kitchen', 'Front of house'], num: [1, 2, 3], rows: WEEKS.map((w, i) => [w, ROLE_HOURS.barista[i], ROLE_HOURS.kitchen[i], ROLE_HOURS.floor[i]]) })}
<h2 class="section">Orders per hour: this Saturday and last Saturday</h2>
<figure>
${lineChart({ labels: HOURS_LBL, yMax: 80, fmt: (v) => v, series: [{ values: SAT_THIS, cls: 'line-1', area: 'area-1' }, { values: SAT_LAST, cls: 'line-previous' }], svgAttrs: 'role="img" aria-label="Area chart: orders per hour on Saturday 14 November compared with Saturday 7 November, 7:00 to 19:00."' })}
<figcaption>This Saturday peaked at 70 orders at 11:00; last Saturday peaked at 66 at 11:00.</figcaption>
</figure>
<ul class="legend">
<li><span class="swatch swatch-1" aria-hidden="true"></span>This Saturday (14 November)</li>
<li><span class="swatch swatch-previous" aria-hidden="true"></span>Last Saturday (7 November)</li>
</ul>
<h2 class="section">Wage cost and sales by day</h2>
<figure>
${scatter({ points: DAILY, xMax: 10000, yMax: 45000, xFmt: (v) => '₹' + v / 1000 + 'k', yFmt: (v) => '₹' + v / 1000 + 'k', xTitle: 'Wage cost per day', yTitle: 'Sales', svgAttrs: 'role="img" aria-label="Scatter plot: wage cost against sales for each of the last 14 days. Days with higher wage cost had higher sales; the busiest Saturday had ₹9,100 of wages and ₹40,200 of sales."' })}
<figcaption>Each dot is one day in the last two weeks. Higher wage cost went with higher sales; wages were between 22% and 33% of sales each day.</figcaption>
</figure>
${dataTable({ caption: 'Wage cost and sales by day', head: ['Day', 'Wage cost', 'Sales'], num: [1, 2], rows: DAILY.map((d, i) => [['Mon 2 Nov', 'Tue 3 Nov', 'Wed 4 Nov', 'Thu 5 Nov', 'Fri 6 Nov', 'Sat 7 Nov', 'Sun 8 Nov', 'Mon 9 Nov', 'Tue 10 Nov', 'Wed 11 Nov', 'Thu 12 Nov', 'Fri 13 Nov', 'Sat 14 Nov', 'Sun 15 Nov'][i], inr(d[0]), inr(d[1])]) })}
<h2 class="section">Staff onboarding funnel</h2>
<p>New starters invited in the last 90 days and how far they got.</p>
<div class="funnel">
<div class="funnel-step" style="width: 100%" onclick="showFunnelStep(this)" data-detail="24 people were invited by email.">Invited: 24</div>
<div class="funnel-step" style="width: 88%" onclick="showFunnelStep(this)" data-detail="21 of 24 accepted the invitation (3 did not open it).">Accepted invitation: 21</div>
<div class="funnel-step" style="width: 71%" onclick="showFunnelStep(this)" data-detail="17 of 21 set their availability (4 stopped at the availability step).">Set availability: 17</div>
<div class="funnel-step" style="width: 58%" onclick="showFunnelStep(this)" data-detail="14 of 17 worked a first shift (3 are still waiting for one).">Worked a first shift: 14</div>
</div>
<p id="funnel-detail" class="muted">Click a step to see where people dropped off.</p>` };

// Time off (clean)
const TIME_OFF = [
  ['Kavya Menon', '24–26 Nov', 3, 'Annual leave', 'Family wedding', 'Pending'],
  ['Rohan Dsouza', '1 Dec', 1, 'Sick leave', 'Doctor appointment', 'Pending'],
  ['Lakshmi Nair', '8–12 Dec', 5, 'Annual leave', 'Exams', 'Pending'],
  ['Dev Malhotra', '20 Nov', 1, 'Unpaid leave', '', 'Approved'],
  ['Ishaan Kapoor', '28–29 Nov', 2, 'Annual leave', 'Travel', 'Declined'],
];
const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_OFF = [14, 22, 18, 9, 12, 16, 27];
pages['app/time-off.html'] = { app: true, title: 'Time-off requests', route: '/app/time-off', body: `
<h1>Time-off requests</h1>
<p>Approved leave is blocked out of the rota automatically (demo data).</p>
<p id="decision-status" role="status"></p>
<div class="table-scroll" role="region" aria-label="Time-off requests" tabindex="0">
<table>
<caption>Time-off requests</caption>
<thead><tr><th scope="col">Team member</th><th scope="col">Dates</th><th scope="col" class="num">Days</th><th scope="col">Type</th><th scope="col">Note</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
<tbody>
${TIME_OFF.map(([n, d, k, t, note, st]) => `<tr data-person="${n}"><th scope="row">${n}</th><td>${d}</td><td class="num">${k}</td><td>${t}</td><td>${note || '<span class="muted">No note</span>'}</td><td data-status>${st}</td><td>${st === 'Pending' ? `<button type="button" class="btn" data-decision="Approved">Approve<span class="visually-hidden"> ${n}, ${d}</span></button> <button type="button" class="btn" data-decision="Declined">Decline<span class="visually-hidden"> ${n}, ${d}</span></button>` : '<span class="muted">Done</span>'}</td></tr>`).join('\n')}
</tbody>
</table>
</div>
<h2 class="section">Days off booked per month</h2>
<figure>
${barChart({ labels: MONTHS, values: DAYS_OFF, yMax: 30, barCls: 's2', svgAttrs: 'role="img" aria-label="Bar chart: days off booked per month, June to December 2026. December is highest at 27 days; September is lowest at 9."' })}
<figcaption>Days off booked across the team, June to December 2026. December is the busiest month for leave.</figcaption>
</figure>
${dataTable({ caption: 'Days off booked per month', head: ['Month', 'Days off'], num: [1], rows: MONTHS.map((m, i) => [m + ' 2026', DAYS_OFF[i]]) })}` };

// Settings: S-16 (icon button, no name), S-20 (icon link, no name)
pages['app/settings.html'] = { app: true, title: 'Settings', route: '/app/settings', body: `
<h1>Café settings (demo)</h1>
<p><a class="icon-btn" href="/help/swap-requests"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"></circle><path d="M10 14v-1m0-3a2 2 0 1 0-2-2" stroke="currentColor" stroke-width="2" fill="none"></path></svg></a> Scheduling help</p>
<p>Notification settings
<button type="button" class="icon-btn"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20"><path d="M10 2a5 5 0 0 0-5 5v3l-2 3h14l-2-3V7a5 5 0 0 0-5-5zm0 16a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2z" fill="currentColor"></path></svg></button>
</p>
<form onsubmit="return false">
<div class="field"><label for="cafe">Café name</label><input id="cafe" name="cafe" type="text" value="Fernhollow Café, Indiranagar" autocomplete="organization"></div>
<div class="field"><label for="opens">Opens at</label><select id="opens" name="opens"><option>06:00</option><option selected>06:30</option><option>07:00</option><option>07:30</option></select></div>
<div class="field"><label for="closes">Closes at</label><select id="closes" name="closes"><option>20:00</option><option>20:30</option><option selected>21:00</option><option>22:00</option></select></div>
<fieldset>
<legend>Week starts on</legend>
<div class="check"><input id="week-mon" name="week" type="radio" value="monday" checked><label for="week-mon">Monday</label></div>
<div class="check"><input id="week-sun" name="week" type="radio" value="sunday"><label for="week-sun">Sunday</label></div>
</fieldset>
<fieldset>
<legend>Rota notifications</legend>
<div class="check"><input id="notify-publish" name="notify-publish" type="checkbox" checked><label for="notify-publish">Tell staff when a rota is published</label></div>
<div class="check"><input id="notify-swap" name="notify-swap" type="checkbox" checked><label for="notify-swap">Tell me when a swap is complete</label></div>
</fieldset>
<button type="submit" class="btn btn-primary">Save settings</button>
</form>` };

// Billing (clean)
const SPEND_M = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
const SPEND = [1200, 1200, 1200, 1416, 1416, 1416];
const INVOICES = [
  ['FH-1046', '1 Nov 2026', 'November 2026', 1416, 'Paid'],
  ['FH-1031', '1 Oct 2026', 'October 2026', 1416, 'Paid'],
  ['FH-1017', '1 Sep 2026', 'September 2026', 1416, 'Paid'],
  ['FH-1002', '1 Aug 2026', 'August 2026', 1200, 'Paid'],
  ['FH-0988', '1 Jul 2026', 'July 2026', 1200, 'Paid'],
  ['FH-0973', '1 Jun 2026', 'June 2026', 1200, 'Paid'],
];
pages['app/billing.html'] = { app: true, title: 'Billing', route: '/app/billing', body: `
<h1>Billing</h1>
<div class="kpi-grid">
${kpi('Current plan', 'Team', inr(1200) + ' a month plus 18% GST')}
${kpi('Next invoice', inr(1416), 'Due 1 December 2026')}
${kpi('Billing contact', 'Accounts', 'accounts@fernhollow-cafe.example.test')}
</div>
<h2 class="section">Monthly spend</h2>
<figure>
${barChart({ labels: SPEND_M, values: SPEND, yMax: 1600, barCls: 's1', fmt: (v) => '₹' + v, svgAttrs: 'role="img" aria-label="Bar chart: monthly spend, June to November 2026. ₹1,200 a month from June to August, then ₹1,416 a month from September once GST was added."' })}
<figcaption>Monthly spend including tax. GST has been added to invoices since September 2026.</figcaption>
</figure>
<h2 class="section">Invoices</h2>
${table({ caption: 'Invoices', head: ['Invoice', 'Issued', 'Period', 'Amount', 'Status'], num: [3], rows: INVOICES.map(([id, d, p, a, s]) => [id, d, p, inr(a), s]) })}
<p class="muted">Invoices are fictional and are not stored anywhere.</p>` };

// Notifications (clean)
const NOTES = [
  [true, 'Kavya Menon asked for 24–26 November off.', '2026-11-15T09:12', 'Today, 09:12'],
  [true, 'Arjun Rao offered his Saturday 14:30 shift. Dev Malhotra took it.', '2026-11-15T08:40', 'Today, 08:40'],
  [false, 'The rota for 16–22 November was published to 10 people.', '2026-11-12T18:05', '12 November, 18:05'],
  [false, 'Invoice FH-1046 for ₹1,416 was paid.', '2026-11-01T10:00', '1 November, 10:00'],
  [false, 'Tara Fernandes updated her availability for December.', '2026-10-30T21:47', '30 October, 21:47'],
];
pages['app/notifications.html'] = { app: true, title: 'Notifications', route: '/app/notifications', body: `
<h1>Notifications</h1>
<p><button type="button" class="btn" id="mark-all-read">Mark all as read</button></p>
<p id="notice-status" role="status"></p>
<ul class="notice-list">
${NOTES.map(([u, t, dt, label]) => `<li data-unread="${u}">${u ? '<span class="badge badge-ok unread-tag">New</span> ' : ''}${t}<br><time class="muted" datetime="${dt}">${label}</time></li>`).join('\n')}
</ul>` };

// ---------- write ----------
let n = 0;
for (const [file, p] of Object.entries(pages)) {
  const out = path.join(SITE, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, shell(p));
  n++;
}
console.log(`wrote ${n} pages to ${path.relative(process.cwd(), SITE) || SITE}`);
