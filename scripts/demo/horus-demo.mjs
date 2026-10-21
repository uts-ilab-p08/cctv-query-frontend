// HORUS demo autopilot
// Drives the app through the showcase demo so you only need to screen-record.
//
// Setup (once): `npm install` (playwright is a devDependency). It uses your installed
// Google Chrome (channel: 'chrome'), so the CCTV videos play with H.264.
//
// Usage:
//   npm run demo:record                        -> full demo on https://cctvai.site, writes demo-chapters.json
//   npm run demo:record -- --check             -> walks the whole flow fast (no recording pauses)
//                                                 and reports OK / MISSING for every step's elements
//   npm run demo:record -- --url http://localhost:3000   -> same, against a local dev server
//
// The real OS cursor does not move when Playwright clicks, so this script draws its own
// cursor (with a click ripple) inside the page. That is the cursor your recording will show.

import { chromium } from 'playwright';
import readline from 'node:readline/promises';
import fs from 'node:fs';

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
function argValue(name) {
  const i = argv.findIndex(a => a === name || a.startsWith(`${name}=`));
  if (i === -1) return undefined;
  return argv[i].includes('=') ? argv[i].slice(argv[i].indexOf('=') + 1) : argv[i + 1];
}
const checkOnly = argv.includes('--check');
const BASE_URL = (argValue('--url') ?? 'https://cctvai.site').replace(/\/+$/, '');

// ---------------------------------------------------------------- config
const CONFIG = {
  url: BASE_URL,
  profileDir: './.horus-chrome-profile', // keeps you logged in between runs
  kiosk: true,          // full screen, no address bar (clean recording). Set false while testing.
  typingDelayMs: checkOnly ? 0 : 65,   // per character
  readPauseMs: 2000,    // pause after each action so viewers can follow
  pace: checkOnly ? 0.05 : 1,          // scales every viewer pause; --check runs at 5 %
  resultsTimeoutMs: 90000,  // the search (RAG + SSE) can take a while
  answerTimeoutMs: 90000,   // a follow-up answer
};

const Q1 = 'What happened at the hospital on 5 March between 1pm and 2pm?';
const Q2 = 'On cameras G505, G508 and G509, are there any people carrying a backpack?';

/** Terms the query field should highlight while the question is on screen. */
const Q1_ENTITIES = [['hospital', /hospital/i], ['5 March', /5\s*March/i], ['1pm–2pm', /1\s*pm[\s\S]*2\s*pm/i]];
const Q2_ENTITIES = [['G505', /G505/], ['G508', /G508/], ['G509', /G509/]];
/** Highlighted terms whose dropdown the demo opens (first token matching each pattern). */
const Q1_MENUS = [['place', /hospital/i], ['date', /March/i], ['time', /\d\s*(am|pm)/i]];
const Q2_MENUS = [['camera', /G50\d/]];
/** Saved query whose "Run again" the demo presses (1-based; the last one if there are fewer). */
const SAVED_QUERY_TO_RUN = 5;

// ---------------------------------------------------------------- selectors
// Taken from the frontend's own markup (aria-labels, roles, data-* hooks). The one
// `data-demo` hook is the highlighted-term span in src/components/query/QueryField.tsx.
const VIDEO = 'video[aria-label="Match footage"]';
const FIELD = 'div:has(> textarea[aria-label="Search the camera network"])';
const S = {
  // QueryField's textarea (Home, and the New Query dialog on Results).
  searchBox:      p => p.getByRole('textbox', { name: 'Search the camera network' }).first(),
  field:          p => p.locator(FIELD).first(),
  // A highlighted term's dropdown (fallback: the field's only popover without a role).
  entityMenu:     p => p.locator('[data-demo="entity-menu"]').or(p.locator(`${FIELD} > div.z-40:not([role])`)).first(),
  timeButton:     p => p.getByRole('button', { name: 'Choose a time' }).first(),
  cameraButton:   p => p.getByRole('button', { name: 'Choose cameras' }).first(),
  timePicker:     p => p.getByRole('group', { name: 'Search at a time' }).first(),
  cameraPicker:   p => p.getByRole('group', { name: 'Search in cameras' }).first(),
  submit:         p => p.getByRole('button', { name: 'Search', exact: true }).first(),
  // Highlighted terms (place, date, time, camera…) drawn over the textarea. The fallback
  // (the only clickable spans in the field's overlay) covers builds without the hook.
  entities:       p => p.locator('[data-demo="entity"]').or(
                        p.locator('div:has(> textarea[aria-label="Search the camera network"]) span.pointer-events-auto')),
  newQueryDialog: p => p.getByRole('dialog', { name: 'New query' }),
  // Results: the MATCHING MOMENTS strip, its cards (each shows "NN%"), and its skeleton.
  matchStrip:     p => p.locator('[data-match-strip]'),
  momentCards:    p => p.locator('[data-match-strip]').getByRole('button').filter({ hasText: /\d{1,3}%/ }),
  confidence:     card => card.getByText(/^\d{1,3}%$/),
  video:          p => p.locator(VIDEO).first(),
  // The big Play button over a paused video (the control bar has its own, smaller one).
  playOverlay:    p => p.locator(`div:has(> ${VIDEO})`).getByRole('button', { name: 'Play', exact: true }),
  // Object-tracking boxes (DetectionOverlay); the label lists what is boxed right now.
  detections:     p => p.locator('svg[aria-label^="Detected objects"]'),
  // Assistant thread on Results.
  agentAnswers:   p => p.getByRole('main').locator('[data-bubble="agent"]'),
  citations:      p => S.agentAnswers(p).last().getByRole('button', { name: /^Source \d+:/ }),
  timeLinks:      p => S.agentAnswers(p).last().getByRole('button', { name: /^Play .* at / }),
  suggested:      p => p.getByRole('main').getByRole('group', { name: 'Suggested questions' })
                        .locator('button:not([disabled])'),
  newQuery:       p => p.getByRole('button', { name: 'New Query', exact: true }),
  // Topbar, top right on Results: "N cameras in this search" opens the cameras dialog.
  camerasInSearch: p => p.getByRole('banner').getByRole('button', { name: /cameras? in this search/ }),
  camerasDialog:  p => p.getByRole('dialog', { name: 'Cameras in this search' }),
  // Sidebar
  savedQueries:   p => p.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Saved Queries' }),
  cameras:        p => p.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Indexed Cameras' }),
  savedHeading:   p => p.getByRole('main').getByRole('heading', { level: 1, name: 'Saved Queries' }),
  camerasHeading: p => p.getByRole('main').getByRole('heading', { level: 1, name: 'Indexed Cameras' }),
  listLoading:    p => p.getByRole('main').getByRole('status', { name: /^Loading/ }),
  savedRows:      p => p.getByRole('main').getByRole('listitem'),
  runAgain:       row => row.getByRole('button', { name: 'Run again' }),
};

// ---------------------------------------------------------------- helpers
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** A pause for viewers: full length when recording, nearly none in --check. */
const pause = ms => sleep(ms * CONFIG.pace);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let page;
let mouse = { x: 960, y: 540 };
let t0 = 0;
const chapters = [];
/** Every element / signal the flow looked for: { step, what, ok, note }. */
const report = [];
let currentStep = 'Setup';

function chapter(title) {
  currentStep = title;
  const start = Math.round(((Date.now() - t0) / 1000) * 10) / 10;
  chapters.push({ start, title });
  console.log(`  [${start.toFixed(1).padStart(6)} s]  ${title}`);
}

function warn(what) {
  console.warn(`  ! could not find "${what}" - skipped`);
}

function record(what, ok, note = '') {
  report.push({ step: currentStep, what, ok, note });
  if (!ok && !checkOnly) warn(note ? `${what} (${note})` : what);
}

/** Runs one chapter's actions; an unexpected error is logged and the demo carries on. */
async function step(fn) {
  try { await fn(); } catch (err) { record('unexpected error', false, err?.message?.split('\n')[0] ?? String(err)); }
}

async function glide(x, y) {
  const dist = Math.hypot(x - mouse.x, y - mouse.y);
  const steps = checkOnly ? 2 : Math.max(15, Math.round(dist / 12));
  await page.mouse.move(x, y, { steps });
  mouse = { x, y };
}

/** Waits for one element to be visible; records OK / MISSING under the current step
 *  (nothing is recorded when `label` is null). */
async function find(loc, label, timeout = 15000) {
  try {
    await loc.waitFor({ state: 'visible', timeout });
    if (label) record(label, true);
    return true;
  } catch {
    if (label) record(label, false);
    return false;
  }
}

/** Glides to an element and holds there. `at` picks the point inside it (fractions). */
async function hover(loc, label, holdMs = 900, at = { x: 0.5, y: 0.5 }) {
  if (!(await find(loc, label))) return false;
  try {
    await loc.scrollIntoViewIfNeeded();
    const b = await loc.boundingBox();
    if (!b) throw new Error('no box');
    await glide(b.x + b.width * at.x, b.y + b.height * at.y);
    await pause(holdMs);
    return true;
  } catch { record(`${label ?? 'element'} (position)`, false); return false; }
}

async function click(loc, label) {
  if (!(await hover(loc, label, 300))) return false;
  await page.mouse.down(); await sleep(70); await page.mouse.up();
  return true;
}

async function typeQuestion(scope, text) {
  const box = S.searchBox(scope);
  if (!(await click(box, 'search box'))) return false;
  await box.fill('');
  await page.keyboard.type(text, { delay: CONFIG.typingDelayMs });
  return true;
}

/** Records whether each expected term is highlighted in the field. */
async function checkHighlights(scope, expected) {
  const texts = await S.entities(scope).allInnerTexts().catch(() => []);
  const joined = texts.join(' | ');
  for (const [name, re] of expected) record(`highlighted "${name}"`, re.test(joined), joined ? `found: ${joined}` : 'no highlighted terms');
}

/** Waits out a running view transition (the New query dialog opens with one): while it
 *  runs, clicks reach its snapshot instead of the page. */
async function settleTransitions() {
  await page.waitForFunction(() => {
    try { return !document.documentElement.matches(':active-view-transition'); } catch { return true; }
  }, null, { timeout: 3000, polling: 100 }).catch(() => {});
}

/** True when something else (e.g. an open dropdown) sits over the element's centre. */
async function isCovered(loc) {
  return loc.evaluate(el => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !hit || !(hit === el || el.contains(hit));
  }).catch(() => false);
}

/** Clicks the first highlighted term matching `re` and shows its dropdown, gliding over a
 *  few options without choosing one (a choice would rewrite the question). */
async function showEntityMenu(scope, name, re) {
  const tokens = S.entities(scope);
  const texts = await tokens.allInnerTexts().catch(() => []);
  const i = texts.findIndex(t => re.test(t));
  if (i < 0) return record(`${name} dropdown`, false, `no highlighted ${name} term`);
  const token = tokens.nth(i);
  const menu = S.entityMenu(scope);
  let opened = false;
  for (let attempt = 1; attempt <= 2 && !opened; attempt++) {
    await settleTransitions();
    // The previous term's dropdown can sit over this term: a click there would pick an option.
    if (await isCovered(token)) await closeMenus(scope);
    if (!(await click(token, attempt === 1 ? `${name} term "${texts[i]}"` : null))) return;
    opened = await find(menu, null, 2500);
  }
  record(`${name} dropdown`, opened);
  if (!opened) return;
  const options = menu.getByRole('button');
  // The camera list can take a moment the first time (it loads /cameras).
  await options.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  const n = await options.count().catch(() => 0);
  record(`${name} dropdown options`, n > 0, `${n} options`);
  for (let k = 0; k < Math.min(3, n); k++) await hover(options.nth(k), null, 600);
  await pause(1400);
}

/** Opens the time picker, then the camera picker (gliding over a few cameras), then closes it. */
async function showPickers(scope) {
  if (await click(S.timeButton(scope), 'time button')) {
    await find(S.timePicker(scope), 'time picker', 5000);
    await pause(2500);
  }
  if (await click(S.cameraButton(scope), 'camera button')) {
    const picker = S.cameraPicker(scope);
    if (await find(picker, 'camera picker', 5000)) {
      const cams = picker.getByRole('button');
      const loaded = await cams.first().waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);
      record('camera list loaded', loaded);
      const n = loaded ? await cams.count() : 0;
      for (let k = 0; k < Math.min(3, n); k++) await hover(cams.nth(k), null, 600);
    }
    await pause(1800);
    await click(S.cameraButton(scope), 'camera button (close)');
    await pause(600);
  }
}

/** Closes any open dropdown or picker with a click on the field's bare textarea (its
 *  margins), at a point no dropdown covers, so the click can never pick an option. */
async function closeMenus(scope) {
  const point = await S.field(scope).evaluate(field => {
    const r = field.getBoundingClientRect();
    const candidates = [[12, r.height / 2], [12, 12], [12, r.height - 12], [r.width / 2, 8], [r.width / 2, r.height - 8]];
    for (const [dx, dy] of candidates) {
      const x = r.left + dx, y = r.top + dy;
      if (document.elementFromPoint(x, y)?.tagName === 'TEXTAREA') return { x, y };
    }
    return null;
  }).catch(() => null);
  if (!point) return record('close dropdown', false, 'no uncovered spot on the field');
  await glide(point.x, point.y);
  await page.mouse.down(); await sleep(70); await page.mouse.up();
  await pause(500);
}

/** Sends the search with the field's Search button: after clicking terms and pickers the
 *  textarea no longer has focus, so Enter would not submit (or would press a picker). */
async function submitSearch(scope, question) {
  if (await click(S.submit(scope), 'Search button')) await waitForResults(question);
}

/** Results are in: the URL carries this question, the skeletons are gone and the strip has cards. */
async function waitForResults(question) {
  await page.waitForURL(u => new URL(u).searchParams.get('q') === question.trim(), { timeout: 20000 })
    .catch(() => record('results URL', false, `still on ${page.url()}`));
  try {
    await page.waitForFunction(() =>
      !!document.querySelector('[data-match-strip]') &&
      !document.querySelector('[role="status"][aria-label="Loading footage"]'),
    null, { timeout: CONFIG.resultsTimeoutMs, polling: 250 });
    const cards = await S.momentCards(page).count();
    record('results loaded', cards > 0, `${cards} moment cards`);
  } catch {
    const noMatches = await page.locator('#no-matches-title').count().catch(() => 0);
    record('results loaded', false, noMatches ? 'the app shows "no matches"' : 'timed out (search error or still loading)');
  }
}

/**
 * The assistant answer is finished: at least `minAnswers` agent bubbles, none still thinking
 * (ThinkingDots' role=status), and none still revealing words (StreamedText's
 * [data-streamed-visible] copy, present only while it streams).
 */
async function waitForAnswer(minAnswers = 1) {
  try {
    await page.waitForFunction(min => {
      const main = document.querySelector('main');
      if (!main) return false;
      return main.querySelectorAll('[data-bubble="agent"]').length >= min &&
        !main.querySelector('[role="status"][aria-label^="Assistant is thinking"]') &&
        !main.querySelector('[data-streamed-visible]');
    }, minAnswers, { timeout: CONFIG.answerTimeoutMs, polling: 200 });
    record('answer finished streaming', true);
    return true;
  } catch { record('answer finished streaming', false, 'timed out'); return false; }
}

async function videoState() {
  return page.evaluate(sel => {
    const v = document.querySelector(sel);
    return v ? { t: v.currentTime, src: v.currentSrc || v.src, paused: v.paused } : null;
  }, VIDEO).catch(() => null);
}

/** Clicks the big Play button if the video is paused, then confirms the playhead moves. */
async function ensurePlaying() {
  const overlay = S.playOverlay(page);
  if (await overlay.isVisible().catch(() => false)) await click(overlay, 'play button over the video');
  const a = await videoState();
  await sleep(1200);
  const b = await videoState();
  const ok = !!a && !!b && !b.paused && b.t > a.t;
  record('video playing', ok, b ? `t=${b.t.toFixed(1)} s${b.paused ? ', paused' : ''}` : 'no video');
}

/** Clicks a citation (or time link) and confirms the player jumped: a new video, or
 *  currentTime away from where steady playback would have taken it. */
async function clickAndVerifyJump(loc, label) {
  const before = await videoState();
  const clickedAt = Date.now();
  if (!(await click(loc, label))) return false;
  let jumped = false, now = before;
  const deadline = Date.now() + 8000;
  while (before && Date.now() < deadline) {
    await sleep(200);
    now = await videoState();
    if (!now) break;
    if (now.src !== before.src) { await sleep(800); now = await videoState() ?? now; jumped = true; break; }
    const drift = before.paused ? 0 : (Date.now() - clickedAt) / 1000;
    if (Math.abs(now.t - before.t - drift) > 1) { jumped = true; break; }
  }
  record(`${label}: video jumped`, jumped,
    before && now ? `${before.t.toFixed(1)} s → ${now.t.toFixed(1)} s` : 'no video on the player');
  return jumped;
}

/** Index of the card with the highest confidence score. */
async function bestCardIndex(cards, n) {
  let best = 0, bestScore = -1;
  for (let i = 0; i < n; i++) {
    const score = Number((await cards.nth(i).innerText()).match(/(\d{1,3})%/)?.[1] ?? -1);
    if (score > bestScore) { best = i; bestScore = score; }
  }
  return best;
}

async function hoverCards(n) {
  const cards = S.momentCards(page);
  const count = Math.min(n, await cards.count().catch(() => 0));
  record(`${n} moment cards`, count >= n, `${count} found`);
  for (let i = 0; i < count; i++) {
    // Rest on the confidence score, bottom right of the thumbnail.
    const score = S.confidence(cards.nth(i));
    if (!(await hover(score, `confidence of card ${i + 1}`, 1300))) await hover(cards.nth(i), `moment card ${i + 1}`, 1100);
  }
}

/** Scrolls slowly through the latest answer: up to its first line, then down to its end. */
async function scrollAnswer() {
  const answer = S.agentAnswers(page).last();
  if (!(await hover(answer, 'assistant answer', 600, { x: 0.5, y: 0.15 }))) return;
  const pos = () => answer.evaluate(el => {
    let list = el.parentElement;
    while (list && !/(auto|scroll)/.test(getComputedStyle(list).overflowY)) list = list.parentElement;
    const r = el.getBoundingClientRect(), l = (list ?? document.documentElement).getBoundingClientRect();
    return { top: r.top - l.top, bottom: r.bottom - l.bottom };
  });
  for (let i = 0; i < 12 && (await pos()).top < 0; i++) { await page.mouse.wheel(0, -160); await sleep(checkOnly ? 50 : 250); }
  await pause(1200);
  for (let i = 0; i < 14 && (await pos()).bottom > 0; i++) { await page.mouse.wheel(0, 120); await pause(750); }
  await pause(600);
}

/**
 * Citations of the latest answer, in order, one per source number. With `distinctMoments`,
 * sources naming the same moment ("event · camera · time" after "Source N: ") count once,
 * so two jumps never land on the same second.
 */
async function distinctCitations(distinctMoments = false) {
  const chips = S.citations(page);
  const n = await chips.count().catch(() => 0);
  const seen = new Set(), out = [];
  for (let i = 0; i < n; i++) {
    const match = (await chips.nth(i).getAttribute('aria-label'))?.match(/^Source (\d+): (.*)$/);
    if (!match) continue;
    const key = distinctMoments ? match[2] : match[1];
    if (!seen.has(key)) { seen.add(key); out.push({ ref: match[1], loc: chips.nth(i) }); }
  }
  return out;
}

/**
 * Clicks a sidebar link and waits for its screen: the URL reaches `path` (one retry if the
 * click didn't navigate), its <h1> shows in <main>, and the list stops loading.
 */
async function openFromSidebar(link, name, path, heading, holdMs) {
  const at = () => new URL(page.url()).pathname;
  let navigated = false;
  for (let attempt = 1; attempt <= 2 && !navigated; attempt++) {
    if (!(await click(link, `${name} (sidebar)`))) return;
    navigated = await page.waitForURL(u => new URL(u).pathname.startsWith(path), { timeout: 10000 })
      .then(() => true, () => false);
    if (!navigated) record(`${name}: navigation`, false, `attempt ${attempt}, still on ${at()}`);
  }
  const shown = await heading.waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false);
  const h1s = shown ? [] : await page.locator('main h1').allInnerTexts().catch(() => []);
  record(`${name} screen`, shown, shown ? '' : `on ${at()}, <h1> in main: ${JSON.stringify(h1s)}`);
  await S.listLoading(page).first().waitFor({ state: 'hidden', timeout: 15000 })
    .catch(() => record(`${name} loaded`, false, 'still loading after 15 s'));
  await pause(holdMs);
}

const cameraOf = text =>text.match(/\bG\d{3}\b/)?.[0] ?? null;

// Fake cursor + click ripple, injected into every page.
function cursorOverlay() {
  if (window.__horusCursor) return;
  window.__horusCursor = true;
  const install = () => {
    const c = document.createElement('div');
    c.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M4 2 L20 11.5 L13 13.1 L9.4 20 Z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, {
      position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none',
      transform: 'translate(-200px,-200px)', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.55))',
    });
    document.documentElement.appendChild(c);
    document.addEventListener('mousemove', e => {
      c.style.transform = `translate(${e.clientX - 5}px, ${e.clientY - 2}px)`;
    }, true);
    document.addEventListener('mousedown', e => {
      const r = document.createElement('div');
      Object.assign(r.style, {
        position: 'fixed', left: `${e.clientX - 18}px`, top: `${e.clientY - 18}px`,
        width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #fbbf24',
        zIndex: '2147483646', pointerEvents: 'none', opacity: '1',
        transition: 'transform .45s ease-out, opacity .45s ease-out',
      });
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = 'scale(1.9)'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 520);
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
}

// White flash used to line up the recording with the chapter times.
async function syncFlash() {
  await page.evaluate(() => new Promise(res => {
    const f = document.createElement('div');
    Object.assign(f.style, { position: 'fixed', inset: '0', background: '#fff', zIndex: '2147483647' });
    document.documentElement.appendChild(f);
    setTimeout(() => { f.remove(); res(); }, 600);
  }));
}

function printReport() {
  console.log('\nElement check:');
  let last = '';
  for (const r of report) {
    if (r.step !== last) { console.log(`\n  ${r.step}`); last = r.step; }
    console.log(`    ${r.ok ? 'OK     ' : 'MISSING'}  ${r.what}${r.note ? `  (${r.note})` : ''}`);
  }
  const missing = report.filter(r => !r.ok).length;
  console.log(`\n${missing ? `${missing} MISSING` : 'Everything found'} - ${report.length} checks.`);
}

// ---------------------------------------------------------------- main
const context = await chromium.launchPersistentContext(CONFIG.profileDir, {
  channel: 'chrome',
  headless: false,
  viewport: null,
  args: CONFIG.kiosk && !checkOnly ? ['--kiosk'] : ['--start-maximized'],
});
await context.addInitScript(cursorOverlay);
page = context.pages()[0] ?? await context.newPage();
// `/` is the public landing page; the search screen is /dashboard (signed-in only).
const SEARCH_URL = `${CONFIG.url}/dashboard`;
await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded' });

// Login (only needed the first time; the profile remembers it)
const searchVisible = () => S.searchBox(page).waitFor({ state: 'visible', timeout: 10000 })
  .then(() => true).catch(() => false);
if (!(await searchVisible())) {
  await rl.question('\nLog in in the browser window, then press Enter here... ');
  if (!(await searchVisible())) {
    await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded' });
    if (!(await searchVisible())) console.warn('  ! the search screen did not load - continuing anyway');
  }
}

if (checkOnly) {
  console.log(`\nChecking the demo flow on ${CONFIG.url} (fast, no recording pauses)...`);
} else {
  await rl.question('\nStart your screen recording now, then press Enter here to begin the demo... ');
  await sleep(1500);
  await syncFlash();
  console.log('\nDemo running (trim your recording to start right after the white flash):');
}
t0 = Date.now();

// 1  Question 1 in plain English
chapter('Ask in plain English');
await step(async () => {
  await typeQuestion(page, Q1);
  await pause(600);
});

// 2  The field highlights place, date and time; then submit
chapter('Understands place, date and time');
await step(async () => {
  await pause(1500);
  await checkHighlights(page, Q1_ENTITIES);
  for (const [name, re] of Q1_MENUS) await showEntityMenu(page, name, re);
});

// 2b  The time and camera pickers beside the field; then submit
chapter('Add filters from the search bar');
await step(async () => {
  // The time button also closes the last dropdown.
  await showPickers(page);
  await submitSearch(page, Q1);
});

// 2c  The Topbar's "N cameras in this search": the cameras behind these results
chapter('Cameras in this search');
await step(async () => {
  await pause(800);
  if (!(await click(S.camerasInSearch(page), 'cameras in this search (top right)'))) return;
  const dialog = S.camerasDialog(page);
  if (await find(dialog, 'Cameras in this search dialog', 5000)) {
    await hover(dialog, null, 3500, { x: 0.5, y: 0.6 });
    await click(dialog.getByRole('button', { name: 'Close dialog' }), 'close the cameras dialog');
    await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => record('cameras dialog closed', false));
  }
  await pause(800);
});

// 3  Ranked moments: rest on each confidence score
chapter('Ranked matching moments');
await step(async () => {
  await pause(800);
  await hoverCards(4);
  await pause(CONFIG.readPauseMs - 1100);
});

// 4  Open the best moment and play it with the tracking boxes
chapter('Tracks people and vehicles');
await step(async () => {
  const cards = S.momentCards(page);
  const n = await cards.count().catch(() => 0);
  if (!n) return record('top moment card', false);
  await click(cards.nth(await bestCardIndex(cards, n)), 'top moment card');
  await pause(800);
  await ensurePlaying();
  await find(S.detections(page).first(), 'tracked-object boxes', 8000);
  // Cursor off to one side so it doesn't cover the boxes.
  await hover(S.video(page), 'video', 6000, { x: 0.92, y: 0.85 });
});

// 5  The cited answer
chapter('Every claim is cited');
await step(async () => {
  await waitForAnswer(1);
  await scrollAnswer();
  const cites = await distinctCitations();
  record('citation markers in the answer', cites.length > 0, `${cites.length} distinct sources`);
  for (const c of cites.slice(0, 3)) await hover(c.loc, `citation [${c.ref}]`, 1300);
  await pause(800);
});

// 6  A citation jumps the player to its exact second (twice)
chapter('One click → the exact second');
await step(async () => {
  let targets = await distinctCitations(true);
  record('citations to different moments', targets.length >= 2, `${targets.length} distinct moments`);
  if (!targets.length) {
    // No numbered chips: fall back to the camera times the answer links ("Play G505 at 13:15:20").
    const links = S.timeLinks(page);
    const n = await links.count().catch(() => 0);
    targets = Array.from({ length: n }, (_, i) => ({ ref: `time ${i + 1}`, loc: links.nth(i) }));
    record('time links (fallback)', n > 0, `${n} found`);
  }
  let jumps = 0;
  for (const c of targets) {
    if (jumps === 2) break;
    if (await clickAndVerifyJump(c.loc, `citation [${c.ref}]`)) {
      jumps++;
      await ensurePlaying();
      await pause(4000);
    } else {
      await pause(600);
    }
  }
  record('two citation jumps', jumps === 2, `${jumps} of 2`);
});

// 7  A suggested follow-up question
chapter('Ask follow-up questions');
await step(async () => {
  const answers = await S.agentAnswers(page).count().catch(() => 0);
  if (await click(S.suggested(page).first(), 'suggested question')) {
    await waitForAnswer(answers + 1);
    await hover(S.agentAnswers(page).last(), 'follow-up answer', CONFIG.readPauseMs, { x: 0.5, y: 0.3 });
  }
});

// 8  New query naming three cameras
chapter('Filter by camera');
await step(async () => {
  if (!(await click(S.newQuery(page), 'New Query button'))) return;
  const dialog = S.newQueryDialog(page);
  await find(dialog, 'New query dialog', 5000);
  await pause(800);
  await typeQuestion(dialog, Q2);
  await pause(1500);
  await checkHighlights(dialog, Q2_ENTITIES);
  for (const [name, re] of Q2_MENUS) await showEntityMenu(dialog, name, re);
  await closeMenus(dialog);
  await submitSearch(dialog, Q2);
});

// 9  Results across several cameras; open a backpack moment
chapter('Search across multiple cameras');
await step(async () => {
  await pause(800);
  await hoverCards(5);
  const cards = S.momentCards(page);
  const n = await cards.count().catch(() => 0);
  if (!n) return record('backpack moment', false);
  const texts = await cards.allInnerTexts();
  const cams = texts.map(cameraOf);
  record('different cameras in the results', new Set(cams.filter(Boolean)).size > 1, [...new Set(cams)].join(', '));
  const backpack = texts.map((t, i) => (/backpack/i.test(t) ? i : -1)).filter(i => i >= 0);
  const pick = backpack.find(i => cams[i] !== cams[0]) ?? backpack[0]
    ?? cams.findIndex(c => c !== cams[0]);
  record('backpack moment', backpack.length > 0, backpack.length ? `card ${pick + 1} (${cams[pick]})` : 'no card mentions a backpack; opening another camera instead');
  await click(cards.nth(pick >= 0 ? pick : 0), 'backpack moment');
  await pause(600);
  await ensurePlaying();
  await hover(S.video(page), 'video', 5000, { x: 0.92, y: 0.85 });
});

// 10  Saved queries and the camera index, through the sidebar
chapter('Saved queries and camera index');
await step(async () => {
  await openFromSidebar(S.savedQueries(page), 'Saved Queries', '/saved', S.savedHeading(page), 2500);
  // "Run again" on one saved query: it runs as a fresh search on Results.
  const rows = S.savedRows(page);
  const n = await rows.count().catch(() => 0);
  record(`${SAVED_QUERY_TO_RUN} saved queries`, n >= SAVED_QUERY_TO_RUN, `${n} found`);
  chapter('Re-run a saved query');
  if (n) {
    const row = rows.nth(Math.min(SAVED_QUERY_TO_RUN, n) - 1);
    const text = (await row.locator('p').first().innerText()).trim();
    await hover(row.locator('p').first(), `saved query "${text}"`, 1500);
    if (await click(S.runAgain(row), 'Run again')) {
      await waitForResults(text);
      await pause(4000);
    }
  }
  chapter('Indexed camera directory');
  await openFromSidebar(S.cameras(page), 'Indexed Cameras', '/cameras', S.camerasHeading(page), 5000);
});

const endAt = Math.round(((Date.now() - t0) / 1000) * 10) / 10;
if (checkOnly) {
  printReport();
  console.log(`\nFlow walked in ${endAt} s.`);
  await context.close(); rl.close(); process.exit(0);
}

fs.writeFileSync('demo-chapters.json', JSON.stringify(chapters, null, 2));
console.log(`\nDone at ${endAt} s. Stop your recording.`);
console.log('Chapters written to demo-chapters.json (copy it to your Remotion project public/ folder).');
const missed = report.filter(r => !r.ok);
if (missed.length) {
  console.log(`\n${missed.length} step(s) had problems:`);
  for (const r of missed) console.log(`  - ${r.step}: ${r.what}${r.note ? ` (${r.note})` : ''}`);
}
await rl.question('Press Enter to close the browser... ');
await context.close();
rl.close();
