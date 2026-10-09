// 試作版の機械検査。スマホ幅（390px）で全画面と主な流れを確かめ、1つでも落ちたら exit 1。
// 使い方: npm install && node tools/verify.mjs   （スクリーンショットは shots/ に出る）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ja-JP' });
const page = await context.newPage();
const errors = [];
const external = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('request', (r) => { const u = r.url(); if (!u.startsWith(ORIGIN) && !u.startsWith('data:') && !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)) external.push(u); });

check('L1 index.html が在る', fs.existsSync(path.join(ROOT, 'index.html')));

// 画面ごとの見た目の検査（横スクロール・押せる大きさ・文字の大きさ・コントラスト）
const AUX = ['badge-ai', 'from', 'src', 'soon', 'demo-badge', 'small', 'moved'];
async function audit(screen) {
  return page.evaluate((AUX) => {
    const out = { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, small: [], tiny: [], contrast: [] };
    const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && !el.closest('[hidden]'); };
    // 押せる要素は 48px 以上（文の中のリンクも含める）
    document.querySelectorAll('a[href], button, input').forEach((el) => {
      if (!visible(el)) return; const r = el.getBoundingClientRect();
      if (r.width < 47.5 || r.height < 47.5) out.small.push(`${el.tagName}「${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 16)}」${Math.round(r.width)}x${Math.round(r.height)}`);
    });
    // 文字のある要素
    const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return [0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]), m[3] === undefined ? 1 : m[3]]; };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; const a = b.match(/[\d.]+/g); if (a && (a.length < 4 || +a[3] > 0.5)) return b; } return 'rgb(255,255,255)'; };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) {
      const t = walker.currentNode; if (!t.textContent.trim()) continue;
      const el = t.parentElement; if (!el || seen.has(el) || !visible(el) || el.closest('.toast')) continue; seen.add(el);
      const cs = getComputedStyle(el); const size = parseFloat(cs.fontSize);
      const aux = AUX.some((c) => el.closest('.' + c));
      if (size < 17.5 && !aux) out.tiny.push(`「${t.textContent.trim().slice(0, 14)}」${size}px`);
      if (size < 14.5) out.tiny.push(`補助でも小さすぎ「${t.textContent.trim().slice(0, 14)}」${size}px`);
      const [l1] = lum(cs.color); const [l2] = lum(bgOf(el));
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const large = size >= 24 || (size >= 18.6 && +cs.fontWeight >= 700);
      if (ratio < (large ? 3 : 4.5)) out.contrast.push(`「${t.textContent.trim().slice(0, 14)}」${ratio.toFixed(2)}`);
    }
    return out;
  }, AUX);
}

// 全体撮影では固定の帯が途中に写り込むので、撮影のときだけ帯を流れに戻す
async function shoot(name) {
  await page.evaluate(() => document.getElementById('toast').classList.remove('show'));
  const h = await page.addStyleTag({ content: '.topbar,.talkbar{position:static!important}.toast{display:none!important}' });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
  await h.evaluate((n) => n.remove());
}

const SCREENS = [['today', '01-today'], ['chat', '02-chat'], ['schedule', '03-schedule'], ['tasks', '04-tasks'], ['univ', '05-univ'], ['memory', '06-memory'], ['add', '07-add']];
await page.goto(`${ORIGIN}/index.html#/today`);
await page.evaluate(() => localStorage.clear());
await page.reload();
for (const [name, shot] of SCREENS) {
  await page.goto(`${ORIGIN}/index.html#/${name}`);
  await page.waitForTimeout(150);
  const a = await audit(name);
  check(`L2 [${name}] 横スクロール 0px`, a.overflow <= 0, a.overflow > 0 ? `${a.overflow}px はみ出し` : '');
  check(`L2 [${name}] 押せる要素は48px以上`, a.small.length === 0, a.small.join(' / '));
  check(`L2 [${name}] 本文18px以上`, a.tiny.length === 0, a.tiny.slice(0, 5).join(' / '));
  check(`L2 [${name}] コントラスト 4.5:1 以上`, a.contrast.length === 0, a.contrast.slice(0, 5).join(' / '));
  await shoot(shot);
}

// フロー① 提案 → 承認する前は変わらない → 承認で6件
await page.goto(`${ORIGIN}/index.html#/today`);
await page.evaluate(() => localStorage.clear());
await page.reload();
const countAI = () => page.evaluate(() => JSON.parse(localStorage.getItem('msp-ai-demo-v1') || '{"events":[]}').events.filter((e) => e.ai).length);
const countAll = () => page.evaluate(() => JSON.parse(localStorage.getItem('msp-ai-demo-v1') || '{"events":[]}').events.length);
await page.getByRole('button', { name: '相談する' }).click();
await page.locator('[data-testid="plan-card"]').waitFor({ timeout: 5000 });
const before = await countAll();
await shoot('08-proposal');
check('L2 フロー① 提案カードが出る', await page.locator('[data-testid="plan-card"] .plan li').count() === 6);
check('L2 フロー① 承認前は予定が増えない', before === 6 && (await countAI()) === 0, `承認前の予定=${before}`);
await page.getByRole('button', { name: 'ウォーキングは夕方に' }).click();
await page.locator('[data-testid="plan-card"]').nth(1).waitFor({ timeout: 5000 });
check('L2 フロー① 案を出し直すと古い案は登録できない', await page.getByRole('button', { name: 'この予定で登録する' }).count() === 1);
await page.getByRole('button', { name: 'この予定で登録する' }).click();
check('L2 フロー① 承認で「AIが追加」が6件', (await countAI()) === 6);
await page.getByRole('button', { name: '来週の予定に、運動と大学の勉強を組み込んで' }).click();
await page.waitForTimeout(1300);
check('L2 フロー① 登録後に頼み直しても二重に登録されない', (await countAI()) === 6 && await page.getByRole('button', { name: 'この予定で登録する' }).count() === 0);
await page.goto(`${ORIGIN}/index.html#/schedule`);
check('L2 フロー① 予定画面に「AIが追加」6件', await page.locator('.ev[data-ai="1"]').count() === 6);
await shoot('09-schedule-after');

// フロー② 昨日の未完了を明日へ
const tasks = () => page.evaluate(() => JSON.parse(localStorage.getItem('msp-ai-demo-v1')).tasks);
const tKey = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
await page.goto(`${ORIGIN}/index.html#/chat`);
await page.getByRole('button', { name: '昨日できなかったことを明日に回して' }).click();
await page.locator('[data-testid="carry-card"]').last().waitFor({ timeout: 5000 });
const mid = await tasks();
check('L2 フロー② 承認前は日付が変わらない', mid.filter((t) => t.id === 't1' || t.id === 't2').every((t) => t.date !== tKey));
await page.getByRole('button', { name: '明日に回す' }).click();
const after = await tasks();
check('L2 フロー② 承認で2件が明日へ', after.filter((t) => (t.id === 't1' || t.id === 't2') && t.date === tKey).length === 2);

// フロー③ 記憶：削除と、承認してから覚える
await page.goto(`${ORIGIN}/index.html#/memory`);
const memCount = () => page.locator('#mem-list .mem').count();
const m0 = await memCount();
await page.locator('#mem-list .mem').first().getByRole('button', { name: '忘れてもらう' }).click();
check('L2 フロー③ 削除すると一覧から消える', (await memCount()) === m0 - 1);
const cand = await page.locator('[data-testid="candidate"] .quote').innerText();
const listText1 = await page.locator('#mem-list').innerText();
check('L2 フロー③ 候補は承認前に一覧へ入らない', !listText1.includes(cand.replace(/[「」]/g, '')));
await page.getByRole('button', { name: '覚える', exact: true }).click();
const listText2 = await page.locator('#mem-list').innerText();
check('L2 フロー③ 「覚える」で一覧に入る', listText2.includes(cand.replace(/[「」]/g, '')));

// フロー④ 忘れてもらったことは、提案の理由に使わない
await page.evaluate(() => localStorage.clear());
await page.goto(`${ORIGIN}/index.html#/memory`);
await page.reload();
await page.locator('#mem-list .mem', { hasText: '30分' }).getByRole('button', { name: '忘れてもらう' }).click();
await page.goto(`${ORIGIN}/index.html#/chat`);
await page.getByRole('button', { name: '来週の予定に、運動と大学の勉強を組み込んで' }).click();
await page.locator('[data-testid="plan-card"]').waitFor({ timeout: 5000 });
const why = await page.locator('[data-testid="plan-card"] .why').innerText();
check('L2 フロー④ 忘れた記憶は提案の理由に出ない', !why.includes('30分') && why.includes('午後'));
const planText = await page.locator('[data-testid="plan-card"] .plan').innerText();
check('L2 フロー④ 忘れた記憶は提案の中身にも使わない', !planText.includes('30分') && planText.includes('15:00'));

check('L1 外部への通信 0件', external.length === 0, external.slice(0, 3).join(' '));
check('L1 コンソールエラー 0件', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`----\nverify: ${results.length - failed}/${results.length} PASS${failed ? `（FAIL ${failed}）` : ''}`);
process.exit(failed ? 1 : 0);
