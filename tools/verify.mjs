// 試作版の機械検査。スマホ幅（390px）で全画面と主な流れを確かめ、1つでも落ちたら exit 1。
// 使い方: npm install && npx playwright install chromium && node tools/verify.mjs   （スクリーンショットは shots/ に出る）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots');
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
const KEY = 'msp-ai-demo-v2';

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
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ja-JP', acceptDownloads: true });
const page = await context.newPage();
const errors = [];
const external = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('request', (r) => { const u = r.url(); if (!u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u); });

const st = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
async function fresh(hash = 'today') {
  await page.goto(`${ORIGIN}/index.html#/${hash}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}
// 全体撮影では固定の帯が途中に写り込むので、撮影のときだけ帯を流れに戻し、通知を隠す
async function shoot(name) {
  const h = await page.addStyleTag({ content: '.topbar,.talkbar{position:static!important}.toast{display:none!important}' });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
  await h.evaluate((n) => n.remove());
}

check('L1 index.html が在る', fs.existsSync(path.join(ROOT, 'index.html')));

// 画面ごとの見た目の検査（横スクロール・押せる大きさ・文字の大きさ・コントラスト）
const AUX = ['.badge-ai', '.from', '.src', '.soon', '.demo-badge', '.small', '.moved', '.src-type', '.chart', '.mod small'];
async function audit() {
  return page.evaluate((AUX) => {
    const out = { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, small: [], tiny: [], contrast: [] };
    const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && !el.closest('[hidden]'); };
    // 押せる要素は 48px 以上（文の中のリンクも含める。見えないファイル選択は、包んでいるボタンの大きさで測る）
    document.querySelectorAll('a[href], button, input, select, textarea, summary').forEach((el) => {
      if (el.type === 'file') el = el.closest('label') || el;
      if (!visible(el)) return; const r = el.getBoundingClientRect();
      if (r.width < 47.5 || r.height < 47.5) out.small.push(`${el.tagName}「${(el.textContent || el.getAttribute('aria-label') || el.name || '').trim().slice(0, 16)}」${Math.round(r.width)}x${Math.round(r.height)}`);
    });
    const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; const a = b.match(/[\d.]+/g); if (a && (a.length < 4 || +a[3] > 0.5)) return b; } return 'rgb(255,255,255)'; };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) {
      const t = walker.currentNode; if (!t.textContent.trim()) continue;
      const el = t.parentElement; if (!el || seen.has(el) || !visible(el) || el.closest('.toast') || el.closest('option')) continue; seen.add(el);
      const cs = getComputedStyle(el); const size = parseFloat(cs.fontSize);
      const aux = AUX.some((c) => el.closest(c));
      if (size < 17.5 && !aux) out.tiny.push(`「${t.textContent.trim().slice(0, 14)}」${size}px`);
      if (size < 14.5) out.tiny.push(`補助でも小さすぎ「${t.textContent.trim().slice(0, 14)}」${size}px`);
      if (el.closest('svg')) continue; // グラフの文字は fill で塗るので色の検査から外す
      const l1 = lum(cs.color), l2 = lum(bgOf(el));
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const large = size >= 24 || (size >= 18.6 && +cs.fontWeight >= 700);
      if (ratio < (large ? 3 : 4.5)) out.contrast.push(`「${t.textContent.trim().slice(0, 14)}」${ratio.toFixed(2)}`);
    }
    return out;
  }, AUX);
}

const SCREENS = [['today', '01-today'], ['chat', '02-chat'], ['all', '03-all'], ['schedule', '04-schedule'], ['tasks', '05-tasks'],
  ['health', '06-health'], ['univ', '07-univ'], ['univ/f1', '08-faculty'], ['lecture/f1/c1/l1', '09-lecture'], ['diary', '10-diary'],
  ['photo', '11-photo'], ['feeds', '12-feeds'], ['invest', '13-invest'], ['life', '14-life'], ['memory', '15-memory'], ['data', '16-data']];
await fresh();
for (const [name, shot] of SCREENS) {
  await page.goto(`${ORIGIN}/index.html#/${name}`);
  await page.waitForTimeout(150);
  const a = await audit();
  check(`L2 [${name}] 横スクロール 0px`, a.overflow <= 0, a.overflow > 0 ? `${a.overflow}px はみ出し` : '');
  check(`L2 [${name}] 押せる要素は48px以上`, a.small.length === 0, a.small.slice(0, 5).join(' / '));
  check(`L2 [${name}] 本文18px以上`, a.tiny.length === 0, a.tiny.slice(0, 5).join(' / '));
  check(`L2 [${name}] コントラスト 4.5:1 以上`, a.contrast.length === 0, a.contrast.slice(0, 5).join(' / '));
  await shoot(shot);
}

// ホームは企画どおりの6ボタン
await page.goto(`${ORIGIN}/index.html#/today`);
const tiles = await page.locator('.tiles.six .tile').allInnerTexts();
check('L1 ホームの6ボタン（予定・やること・健康・大学・日記・すべて）', tiles.map((x) => x.trim()).join(',') === '予定,やること,健康,大学,日記,すべて', tiles.join(','));

// フロー① 提案 → 承認する前は変わらない → 承認で6件
await fresh();
const countAI = async () => (await st()).events.filter((e) => e.ai).length;
await page.getByRole('button', { name: '相談する' }).click();
await page.locator('[data-testid="plan-card"]').waitFor({ timeout: 5000 });
await shoot('20-proposal');
check('L2 フロー① 提案カードが出る', await page.locator('[data-testid="plan-card"] .plan li').count() === 6);
check('L2 フロー① 承認前は予定が増えない', (await st()).events.length === 6 && (await countAI()) === 0);
await page.getByRole('button', { name: 'ウォーキングは夕方に' }).click();
await page.locator('[data-testid="plan-card"]').nth(1).waitFor({ timeout: 5000 });
check('L2 フロー① 案を出し直すと古い案は登録できない', await page.getByRole('button', { name: 'この予定で登録する' }).count() === 1);
await page.getByRole('button', { name: 'この予定で登録する' }).click();
check('L2 フロー① 承認で「AIが追加」が6件', (await countAI()) === 6);
await page.getByRole('button', { name: '来週の予定に、運動と大学の勉強を組み込んで' }).click();
await page.waitForTimeout(1300);
check('L2 フロー① 登録後に頼み直しても二重に登録されない', (await countAI()) === 6 && await page.getByRole('button', { name: 'この予定で登録する' }).count() === 0);
// 提出用の写真は、提案（20）と同じ朝の案をそのまま登録した状態で撮る
await fresh();
await page.getByRole('button', { name: '相談する' }).click();
await page.locator('[data-testid="plan-card"]').waitFor({ timeout: 5000 });
await page.getByRole('button', { name: 'この予定で登録する' }).click();
await page.goto(`${ORIGIN}/index.html#/schedule`);
check('L2 フロー① 予定画面に「AIが追加」6件', await page.locator('.ev[data-ai="1"]').count() === 6);
await shoot('21-schedule-after');

// フロー② 昨日の未完了を明日へ
const tKey = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
await page.goto(`${ORIGIN}/index.html#/chat`);
await page.getByRole('button', { name: '昨日できなかったことを明日に回して' }).click();
await page.locator('[data-testid="carry-card"]').last().waitFor({ timeout: 5000 });
check('L2 フロー② 承認前は日付が変わらない', (await st()).tasks.filter((t) => t.id === 't1' || t.id === 't2').every((t) => t.date !== tKey));
await page.getByRole('button', { name: '明日に回す' }).click();
check('L2 フロー② 承認で2件が明日へ', (await st()).tasks.filter((t) => (t.id === 't1' || t.id === 't2') && t.date === tKey).length === 2);

// フロー③ 記憶：削除と、承認してから覚える
await page.goto(`${ORIGIN}/index.html#/memory`);
const memCount = () => page.locator('#mem-list .mem').count();
const m0 = await memCount();
await page.locator('#mem-list .mem').first().getByRole('button', { name: '忘れてもらう' }).click();
check('L2 フロー③ 削除すると一覧から消える', (await memCount()) === m0 - 1);
const cand = (await page.locator('[data-testid="candidate"] .quote').first().innerText()).replace(/[「」]/g, '');
check('L2 フロー③ 候補は承認前に一覧へ入らない', !(await page.locator('#mem-list').innerText()).includes(cand));
await page.getByRole('button', { name: '覚える', exact: true }).first().click();
check('L2 フロー③ 「覚える」で一覧に入る', (await page.locator('#mem-list').innerText()).includes(cand));

// フロー④ 忘れてもらったことは、提案の理由にも中身にも使わない
await fresh('memory');
await page.locator('#mem-list .mem', { hasText: '30分' }).getByRole('button', { name: '忘れてもらう' }).click();
await page.goto(`${ORIGIN}/index.html#/chat`);
await page.getByRole('button', { name: '来週の予定に、運動と大学の勉強を組み込んで' }).click();
await page.locator('[data-testid="plan-card"]').waitFor({ timeout: 5000 });
const why = await page.locator('[data-testid="plan-card"] .why').innerText();
check('L2 フロー④ 忘れた記憶は提案の理由に出ない', !why.includes('30分') && why.includes('午後'));
const planText = await page.locator('[data-testid="plan-card"] .plan').innerText();
check('L2 フロー④ 忘れた記憶は提案の中身にも使わない', !planText.includes('30分') && planText.includes('15:00'));

// フロー⑤ 「午後」を忘れても、火曜午前の通院と重ねない
await fresh('memory');
await page.locator('#mem-list .mem', { hasText: '午後' }).getByRole('button', { name: '忘れてもらう' }).click();
await page.goto(`${ORIGIN}/index.html#/chat`);
await page.getByRole('button', { name: '来週の予定に、運動と大学の勉強を組み込んで' }).click();
await page.locator('[data-testid="plan-card"]').waitFor({ timeout: 5000 });
const tue = (await page.locator('[data-testid="plan-card"] .plan li').allInnerTexts()).filter((x) => x.includes('（火）'));
check('L2 フロー⑤ 午後を忘れても火曜の午前に入れない', tue.length === 1 && !/（火）\s*(?:[0-9]|1[01]):/.test(tue[0]), tue.join(' | '));

// フロー⑥ 領域をまたぐ提案（健康の記録・地域の会・大学）→ 承認で予定とやることへ
await fresh('chat');
await page.getByRole('button', { name: '最近運動不足だから、何か始めたい' }).click();
const ex = page.locator('[data-testid="exercise-card"]');
await ex.waitFor({ timeout: 5000 });
const exText = await ex.innerText();
check('L2 フロー⑥ 提案が健康・関心情報・大学をまたぐ', exText.includes('歩数') && exText.includes('朝歩こう会') && exText.includes('健康長寿学部'));
const avg = await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); const d = new Date(); const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; const xs = s.health.filter((h) => h.kind === 'steps' && h.date !== t); return Math.round(xs.reduce((a, h) => a + h.value, 0) / xs.length); }, KEY);
check('L2 フロー⑥ 歩数の平均は記録から計算した値（きのうまで）', exText.includes(avg.toLocaleString('ja-JP') + '歩'), `記録の平均=${avg}`);
await shoot('22-cross-domain');
const ev0 = (await st()).events.length, tk0 = (await st()).tasks.length;
check('L2 フロー⑥ 承認前は何も増えない', ev0 === 6 && tk0 === 8);
await page.getByRole('button', { name: '予定とやることに入れる' }).click();
const s6 = await st();
check('L2 フロー⑥ 承認で予定1件とやること1件が増える', s6.events.length === 7 && s6.tasks.length === 9 && s6.events.some((e) => e.ai && e.title.includes('朝歩こう会')));

// 健康の画面：AIの平均と最少日は、同じ物差し（きのうまで）で記録と一致する
await page.goto(`${ORIGIN}/index.html#/health`);
const hint = await page.locator('.ai-hint').innerText();
const low = await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); const d = new Date(); const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; return Math.min(...s.health.filter((h) => h.kind === 'steps' && h.date !== t).map((h) => h.value)); }, KEY);
check('L2 健康：AIの平均と最少日は同じ物差しで記録と一致', hint.includes(avg.toLocaleString('ja-JP') + '歩') && hint.includes(low.toLocaleString('ja-JP') + '歩'), `平均=${avg} 最少=${low}`);

// フロー⑥b 登録を外した会のことは言わない
await fresh('feeds');
await page.locator('.source', { hasText: '朝歩こう会' }).getByRole('button', { name: '登録を外す' }).click();
await page.goto(`${ORIGIN}/index.html#/chat`);
await page.getByRole('button', { name: '最近運動不足だから、何か始めたい' }).click();
await page.locator('[data-testid="exercise-card"]').waitFor({ timeout: 5000 });
const ex2 = await page.locator('[data-testid="exercise-card"]').innerText();
check('L2 フロー⑥b 登録を外した会を「登録している」と言わない', !ex2.includes('登録している「朝歩こう会」') && ex2.includes('まだ登録されていません'));

// ホームの学びの進み具合と、大学の受講数が一致する
await fresh();
const homeProg = await page.locator('.summary', { hasText: '学びの進み具合' }).innerText();
await page.goto(`${ORIGIN}/index.html#/univ/f1`);
const courseTxt = await page.locator('[data-testid="course"]').first().innerText();
const doneHome = (homeProg.match(/(\d+)\s*\/\s*8回/) || [])[1], doneUniv = (courseTxt.match(/受講ずみ (\d+)/) || [])[1];
check('L2 ホームと大学の受講数が一致', doneHome !== undefined && doneHome === doneUniv, `ホーム=${doneHome} 大学=${doneUniv}`);
await page.goto(`${ORIGIN}/index.html#/chat`);

// フロー⑦ 学部をつくる（12週の計画 → 承認で学部ができる）
await page.getByRole('button', { name: '地元の歴史を学ぶ学部をつくって' }).click();
await page.locator('[data-testid="faculty-card"]').waitFor({ timeout: 5000 });
check('L2 フロー⑦ 承認前は学部が増えない', (await st()).univ.length === 4);
await page.getByRole('button', { name: 'この学部をつくる' }).click();
check('L2 フロー⑦ 承認で学部が1つ増える', (await st()).univ.length === 5 && (await st()).univ.some((f) => f.name === '郷土の歴史学部'));
await page.goto(`${ORIGIN}/index.html#/univ`);
check('L2 フロー⑦ 大学の一覧に出る', (await page.locator('.faculty', { hasText: '郷土の歴史学部' }).count()) === 1);

// フロー⑧ 健康の記録
await page.goto(`${ORIGIN}/index.html#/health`);
await page.selectOption('#f-health select[name=kind]', 'steps');
await page.fill('#f-health input[name=value]', '６５００');
await page.click('#f-health button[type=submit]');
const today = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
const stepsToday = (await st()).health.filter((h) => h.kind === 'steps' && h.date === today);
check('L2 フロー⑧ 歩数を記録すると今日の値が置きかわる（全角数字も可）', stepsToday.length === 1 && stepsToday[0].value === 6500);

// フロー⑨ 日記の保存と検索
await page.goto(`${ORIGIN}/index.html#/diary`);
await page.fill('#diary-text', '囲碁サークルの体験会に申し込んだ。');
await page.click('#f-diary button[type=submit]');
check('L2 フロー⑨ 日記を保存できる', (await st()).diary.length === 4);
await page.fill('#f-diary-search input[name=q]', '散歩');
await page.click('#f-diary-search button[type=submit]');
check('L2 フロー⑨ 言葉で探せる', (await page.locator('#diary-list .diary-item').count()) === 2 && (await page.locator('[data-testid="diary-hits"]').innerText()).includes('2件'));

// フロー⑩ 講義：小テストと、受講すると覚えるかの確認が出る
await page.goto(`${ORIGIN}/index.html#/lecture/f1/c1/l1`);
await page.getByRole('button', { name: '続けられる小さな工夫から始める' }).click();
check('L2 フロー⑩ 小テストの正誤が出る', (await page.locator('#quiz-result').innerText()).includes('正解'));
await page.goto(`${ORIGIN}/index.html#/univ`);
await page.locator('.next-lecture').click();
await page.getByRole('button', { name: '野菜・海藻・きのこ' }).click();
check('L2 フロー⑩ 大学の「次に受ける講義」から、小テストつきの未受講の講義に入れる', (await page.locator('#quiz-result').innerText()).includes('正解'));
const c0 = (await st()).candidates.length;
await page.getByRole('button', { name: '受講した' }).click();
check('L2 フロー⑩ 受講すると「覚えるか」の候補が増える（勝手には覚えない）', (await st()).candidates.length === c0 + 1);

// フロー⑪ 写真
await page.goto(`${ORIGIN}/index.html#/photo`);
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGNgYGD4z8DAwMDAAAAAEAAB3JZJmAAAAABJRU5ErkJggg==', 'base64');
await page.setInputFiles('#photo-file', { name: 'test.png', mimeType: 'image/png', buffer: png });
await page.waitForFunction(() => document.getElementById('photo-chosen').textContent.includes('選びました'), null, { timeout: 5000 });
await page.fill('#f-photo input[name=memo]', '検査の写真');
await page.click('#f-photo button[type=submit]');
check('L2 フロー⑪ 写真とメモを保存できる', (await st()).photos.length === 4 && (await page.locator('.photo img').count()) === 1);

// フロー⑫ 機能を足す（育つアプリ）
await page.goto(`${ORIGIN}/index.html#/all`);
await page.locator('.mod.off', { hasText: '投資' }).click();
check('L2 足していない機能には記録が入っていない（育つアプリ）', (await st()).invest.length === 0 && (await st()).life.length === 0);
check('L2 フロー⑫ 「すべて」から機能を足せる', (await st()).active.invest === true && (await page.locator('a.mod', { hasText: '投資' }).count()) === 1);

// フロー⑬ 書き出し
await page.goto(`${ORIGIN}/index.html#/data`);
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '記録をファイルに書き出す（JSON）' }).click()]);
const dumped = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
check('L2 フロー⑬ 記録をJSONで書き出せる', dumped.v === 2 && Array.isArray(dumped.events) && Array.isArray(dumped.health) && !('chat' in dumped));

check('L1 外部への通信 0件', external.length === 0, external.slice(0, 3).join(' '));
check('L1 コンソールエラー 0件', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`----\nverify: ${results.length - failed}/${results.length} PASS${failed ? `（FAIL ${failed}）` : ''}`);
process.exit(failed ? 1 : 0);
