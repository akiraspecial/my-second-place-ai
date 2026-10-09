/* My Second Place AI — コンセプト・プロトタイプ
 * AIの返事は決めておいた台本で返す（本物のAIには接続しない）。
 * 予定・やること・記憶は、本人が承認したときだけ書き換わる。 */
(function () {
  'use strict';

  var STORE_KEY = 'msp-ai-demo-v1';
  var NAME = 'あきら';
  var WD = ['日', '月', '火', '水', '木', '金', '土'];

  // ---------- 日付 ----------
  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function key(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fromKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function label(d) { return (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WD[d.getDay()] + '）'; }

  var TODAY = startOfDay(new Date());
  var YESTERDAY = addDays(TODAY, -1);
  var TOMORROW = addDays(TODAY, 1);
  var NEXT_MON = addDays(TODAY, ((8 - TODAY.getDay()) % 7) || 7);
  function nextWeek(dow) { return addDays(NEXT_MON, (dow + 6) % 7); } // dow: 0=日 … 6=土

  // ---------- 初期データ ----------
  function seed() {
    return {
      guideClosed: false,
      events: [
        { id: 'e1', date: key(TODAY), time: '10:00', title: '図書館の読書会' },
        { id: 'e2', date: key(TODAY), time: '14:00', title: '大学「予防栄養学の基礎」第3回', univ: true },
        { id: 'e3', date: key(TODAY), time: '19:00', title: '家族とビデオ通話' },
        { id: 'e4', date: key(TOMORROW), time: '9:00', title: '地域の清掃活動' },
        { id: 'e5', date: key(nextWeek(2)), time: '9:30', title: '通院（定期）' },
        { id: 'e6', date: key(nextWeek(5)), time: '18:00', title: '友人と会食' }
      ],
      tasks: [
        { id: 't1', date: key(YESTERDAY), title: '電球を買う', done: false },
        { id: 't2', date: key(YESTERDAY), title: '通帳の記帳', done: false },
        { id: 't3', date: key(YESTERDAY), title: '朝の散歩', done: true },
        { id: 't4', date: key(TODAY), title: '牛乳と卵を買う', done: false },
        { id: 't5', date: key(TODAY), title: '書類の整理（30分）', done: false },
        { id: 't6', date: key(TODAY), title: '第3回の復習ノート', done: false },
        { id: 't7', date: key(TODAY), title: 'いすスクワット 10回', done: false },
        { id: 't8', date: key(TOMORROW), title: '清掃活動の軍手を用意', done: false }
      ],
      memories: [
        { id: 'm1', text: '朝は6時ごろに起きる', src: '9月28日の会話から・承認ずみ' },
        { id: 'm2', text: '歩くのは30分くらいが続けやすい', src: '10月2日の会話から・承認ずみ' },
        { id: 'm3', text: '学ぶのは午後のほうが集中できる', src: '10月5日の会話から・承認ずみ' },
        { id: 'm4', text: '火曜の午前は定期の通院がある', src: '予定から・承認ずみ' },
        { id: 'm5', text: '予防栄養学を学んでいる。食事と運動のつながりに関心がある', src: '大学の登録から・承認ずみ' },
        { id: 'm6', text: '人生後半の居場所づくりについて発信している', src: '自己紹介から・承認ずみ' }
      ],
      candidates: [
        { id: 'c1', text: '日曜の夜は、家族と電話することが多い', src: 'きのうの会話から' }
      ],
      features: { health: false, diary: false, photo: false, community: false, oshi: false, invest: false, life: false },
      chat: [],
      seq: 100
    };
  }

  var state;
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) { var s = JSON.parse(raw); if (s && s.events && s.today === key(TODAY)) return s; }
    } catch (e) { /* 保存が使えない環境でも動かす */ }
    var s0 = seed(); s0.today = key(TODAY); return s0;
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* noop */ } }
  function nid(p) { state.seq += 1; return p + state.seq; }
  state = load();
  state.typing = false; state.editing = null;

  // ---------- 小道具 ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function byTime(a, b) {
    var ta = a.time.split(':'), tb = b.time.split(':');
    return (+ta[0] * 60 + +ta[1]) - (+tb[0] * 60 + +tb[1]);
  }
  function eventsOn(k) { return state.events.filter(function (e) { return e.date === k; }).sort(byTime); }
  function tasksOn(k) { return state.tasks.filter(function (t) { return t.date === k; }); }
  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3200);
  }

  var ICON = {
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    task: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12.5l3 3 5.5-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    univ: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    mem: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7.5 2.8C19.5 16.4 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-2.5-6.5z" fill="currentColor"/></svg>',
    health: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2-5 4 10 2-5h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    diary: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h11a2 2 0 0 1 2 2v16H8a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 8h6M10 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    photo: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    community: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16.5" cy="9" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.5 19c.8-3 3-4.5 5.5-4.5S12.7 16 13.5 19M14 14.8c2.6-.8 5.6.4 6.5 3.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    oshi: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    invest: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20h18M5 16l5-5 3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    life: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M12 7c-3-3-7-2-8 1 3 0 6 1 8 4 2-3 5-4 8-4-1-3-5-4-8-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
  };

  var FEATURES = [
    { id: 'health', name: '健康', desc: '食事・運動・睡眠の記録と、続けやすい習慣づくり' },
    { id: 'diary', name: '音声日記', desc: '話すだけで、毎日の出来事を残す' },
    { id: 'photo', name: '写真', desc: '思い出の写真を、AIが日付や人で整理' },
    { id: 'community', name: 'コミュニティ', desc: '仲間・地域の活動・イベントを見つける' },
    { id: 'oshi', name: '推し活', desc: '好きなことの最新情報とイベント' },
    { id: 'invest', name: '投資', desc: '資産の記録と、市場の情報をやさしく' },
    { id: 'life', name: '人生の記録', desc: '価値観・経験・これからの目標をまとめる' }
  ];

  // ---------- 台本（AIの返事） ----------
  function remembers(re) { return state.memories.some(function (m) { return re.test(m.text); }); }
  function walkTime() { return state.walkEvening ? '16:30' : '7:00'; }
  function reviewTime() { return remembers(/日曜の夜/) ? '16:00' : '19:00'; }
  function buildPlan() {
    var w = walkTime();
    return [
      { date: key(nextWeek(1)), time: w, title: 'ウォーキング 30分', kind: 'walk' },
      { date: key(nextWeek(2)), time: '15:00', title: '大学「予防栄養学の基礎」第4回（45分）', kind: 'univ', univ: true },
      { date: key(nextWeek(3)), time: w, title: 'ウォーキング 30分', kind: 'walk' },
      { date: key(nextWeek(4)), time: '15:00', title: '大学「予防栄養学の基礎」第5回（45分）', kind: 'univ', univ: true },
      { date: key(nextWeek(6)), time: w, title: 'ウォーキング 30分', kind: 'walk' },
      { date: key(nextWeek(0)), time: reviewTime(), title: '1週間のふりかえり（健康と学び）', kind: 'review' }
    ];
  }
  function planApproved() { return state.events.some(function (e) { return e.ai; }); }
  function movableTasks() { return state.tasks.filter(function (t) { return t.date === key(YESTERDAY) && !t.done; }); }

  var EXAMPLES = [
    { id: 'plan', text: '来週の予定に、運動と大学の勉強を組み込んで', lead: true },
    { id: 'carry', text: '昨日できなかったことを明日に回して' },
    { id: 'thu', text: '来週の木曜日に、運動する時間はある？' },
    { id: 'univ', text: '予防栄養学の次の授業はいつ？' },
    { id: 'me', text: '私について覚えていることを教えて' }
  ];

  function intentOf(text) {
    var t = text.replace(/\s/g, '');
    if (/夕方/.test(t) && /(歩|ウォーキング|運動)/.test(t)) return 'evening';
    if (/(組み込|計画|入れて|考えて)/.test(t)) return 'plan';
    if (/(回して|できなかった|残った)/.test(t)) return 'carry';
    if (/木曜/.test(t)) return 'thu';
    if (/(大学|授業|講座|勉強)/.test(t)) return 'univ';
    if (/覚え/.test(t)) return 'me';
    return 'other';
  }

  function reply(intent) {
    switch (intent) {
      case 'plan':
      case 'evening':
        if (intent === 'evening') state.walkEvening = true;
        if (planApproved()) {
          return { kind: 'text', html: '来週の運動と勉強は、もう予定に入っています。<a href="#/schedule">予定を見る</a>と確かめられます。' };
        }
        state.chat.forEach(function (m) { if (m.body && m.body.kind === 'plan' && m.body.status === 'pending') m.body.status = 'superseded'; });
        return { kind: 'plan', id: nid('p'), status: 'pending', evening: !!state.walkEvening, review: reviewTime(), why: planReasons() };
      case 'carry':
        var m = movableTasks();
        if (!m.length) return { kind: 'text', html: '昨日のやることは、すべて片づいています。おつかれさまでした。' };
        return { kind: 'carry', id: nid('c'), status: 'pending', ids: m.map(function (t) { return t.id; }) };
      case 'thu':
        var thu = nextWeek(4), evs = eventsOn(key(thu));
        var busy = evs.length ? evs.map(function (e) { return e.time + '〜 ' + e.title; }).join('、') : '予定は入っていません';
        return { kind: 'text', html: esc(label(thu)) + 'は、' + esc(busy) + '。<br>朝7時ごろなら空いています。いつもの30分のウォーキングはいかがですか？' };
      case 'univ':
        var nextU = state.events.filter(function (e) { return e.univ && fromKey(e.date) > TODAY; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
        if (nextU) return { kind: 'text', html: '次の授業は <b>' + esc(label(fromKey(nextU.date)) + ' ' + nextU.time) + '</b> の「' + esc(nextU.title.replace(/^大学「予防栄養学の基礎」/, '')) + '」です。<br><a href="#/univ">大学を開く</a>' };
        return { kind: 'text', html: '今日の14時の第3回のあと、第4回はまだ予定に入っていません。<br>「来週の予定に、運動と大学の勉強を組み込んで」と言っていただければ、空いている時間を探します。' };
      case 'me':
        return { kind: 'text', html: 'いま覚えていることは ' + state.memories.length + ' 件です。たとえば「' + esc(state.memories[0] ? state.memories[0].text : '') + '」など。<br>直したいこと・忘れてほしいことは、いつでも変えられます。<br><a href="#/memory">覚えていることを見る</a>' };
      default:
        return { kind: 'text', html: 'この試作版では、下の「話しかける例」から試せます。<br>製品版では、どんな言い方でも受けとめて、予定やタスクに落とし込みます。' };
    }
  }

  function send(text) {
    if (!text || !text.trim()) return;
    state.chat.push({ who: 'me', text: text.trim() });
    state.typing = true; save(); renderChat(true);
    setTimeout(function () {
      state.typing = false;
      state.chat.push({ who: 'ai', body: reply(intentOf(text)) });
      save(); renderChat(true);
    }, 900);
  }

  // ---------- 承認 ----------
  function approvePlan(id) {
    var msg = findMsg(id); if (!msg || msg.body.status !== 'pending' || planApproved()) return;
    buildPlanFor(msg.body).forEach(function (p) {
      state.events.push({ id: nid('e'), date: p.date, time: p.time, title: p.title, ai: true, univ: !!p.univ });
    });
    msg.body.status = 'approved';
    state.chat.push({ who: 'ai', body: { kind: 'text', html: '来週の予定に <b>6件</b> 登録しました。前の日の夜に、お知らせします。<br><a href="#/schedule">予定を見る</a>' } });
    save(); renderChat(true); toast('予定に6件を登録しました');
  }
  function approveCarry(id) {
    var msg = findMsg(id); if (!msg || msg.body.status !== 'pending') return;
    msg.body.ids.forEach(function (tid) {
      var t = state.tasks.find(function (x) { return x.id === tid; });
      if (t) { t.date = key(TOMORROW); t.moved = true; }
    });
    msg.body.status = 'approved';
    state.chat.push({ who: 'ai', body: { kind: 'text', html: msg.body.ids.length + '件を明日のやることに回しました。<br><a href="#/tasks">やることを見る</a>' } });
    save(); renderChat(true); toast('明日のやることに回しました');
  }
  function decline(id) {
    var msg = findMsg(id); if (!msg || msg.body.status !== 'pending') return;
    msg.body.status = 'declined';
    state.chat.push({ who: 'ai', body: { kind: 'text', html: 'わかりました。何も変えていません。また声をかけてください。' } });
    save(); renderChat(true);
  }
  function findMsg(id) { return state.chat.find(function (m) { return m.body && m.body.id === id; }); }

  // ---------- 画面 ----------
  var view = document.getElementById('view');
  var ROUTES = { today: renderToday, chat: renderChat, schedule: renderSchedule, tasks: renderTasks, univ: renderUniv, memory: renderMemory, add: renderAdd };

  function route() {
    var name = (location.hash.replace(/^#\/?/, '') || 'today').split('?')[0];
    if (!ROUTES[name]) name = 'today';
    document.getElementById('back').hidden = name === 'today';
    document.getElementById('talkbar').hidden = name === 'chat';
    document.body.setAttribute('data-screen', name);
    ROUTES[name]();
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
  }

  function renderToday() {
    var evs = eventsOn(key(TODAY));
    var tks = tasksOn(key(TODAY));
    var tiles = [
      { href: '#/schedule', icon: 'cal', name: '予定' },
      { href: '#/tasks', icon: 'task', name: 'やること' },
      { href: '#/univ', icon: 'univ', name: '大学' },
      { href: '#/memory', icon: 'mem', name: '覚えていること' }
    ];
    FEATURES.forEach(function (f) { if (state.features[f.id]) tiles.push({ feature: f.id, icon: f.id, name: f.name }); });

    var hint = planApproved()
      ? '来週の運動と勉強の予定が入りました。前の日の夜に、お知らせしますね。'
      : '来週の予定に、まだ空きがあります。運動と大学の勉強の時間を、一緒に考えましょうか？';

    view.innerHTML =
      '<section class="hello">' +
        '<p class="date">' + esc(label(TODAY)) + '</p>' +
        '<h1>こんにちは、' + NAME + 'さん</h1>' +
        '<p class="sub">今日も、自分らしい一日を。</p>' +
        '<p class="note">※試作版に出てくる予定や記憶は、説明のための例です。</p>' +
      '</section>' +
      (state.guideClosed ? '' :
      '<section class="guide" aria-label="この試作版の見どころ">' +
        '<h2>はじめての方へ　3分の見どころ</h2>' +
        '<ol><li>下の「相談する」を押す</li><li>AIの提案を見て「この予定で登録する」</li><li>「予定」に入ったことを確かめる</li><li>「覚えていること」で、AIが何を覚えているかを見る</li></ol>' +
        '<div class="row"><button class="btn quiet" data-act="close-guide">わかりました</button></div>' +
      '</section>') +
      '<section class="ai-hint">' +
        '<div class="avatar" aria-hidden="true">AI</div>' +
        '<div><p>' + esc(hint) + '</p>' +
        (planApproved() ? '<a class="btn secondary" href="#/schedule">来週の予定を見る</a>' : '<button class="btn" data-act="consult">相談する</button>') +
        '</div>' +
      '</section>' +
      '<div class="stack" style="margin-top:18px">' +
        '<a class="card summary" href="#/schedule"><div class="summary-head"><h2>今日の予定</h2><span class="count">' + evs.length + '件</span></div>' +
          '<ul>' + evs.map(function (e) { return '<li><span class="time">' + esc(e.time) + '</span><span>' + esc(e.title) + '</span></li>'; }).join('') + '</ul>' +
        '</a>' +
        '<a class="card summary" href="#/tasks"><div class="summary-head"><h2>今日のやること</h2><span class="count">' + tks.length + '件</span></div>' +
          '<ul>' + tks.map(function (t) { return '<li><span>' + (t.done ? '✓ ' : '・') + esc(t.title) + '</span></li>'; }).join('') + '</ul>' +
        '</a>' +
      '</div>' +
      '<h2 class="section-title">メニュー</h2>' +
      '<div class="tiles">' +
        tiles.map(function (t) {
          if (t.feature) return '<button class="tile" data-act="soon" data-name="' + esc(t.name) + '">' + ICON[t.icon] + '<span>' + esc(t.name) + '</span><span class="soon">これから開発</span></button>';
          return '<a class="tile" href="' + t.href + '">' + ICON[t.icon] + '<span>' + esc(t.name) + '</span></a>';
        }).join('') +
        '<a class="tile add" href="#/add">' + ICON.plus + '<span>機能をふやす</span></a>' +
      '</div>' +
      '<div class="reset"><button class="btn quiet" data-act="reset">試作版を最初からやり直す</button></div>';
  }

  function chatBody(m) {
    var b = m.body;
    if (b.kind === 'text') return '<div class="bubble">' + b.html + '</div>';
    if (b.kind === 'plan') {
      var plan = buildPlanFor(b);
      return '<div class="bubble wide" data-testid="plan-card">' +
        '<p>来週は <b>火曜の午前に通院</b>、<b>金曜の夜に友人と会食</b>がありますね。空いている時間に、こんな計画はいかがでしょうか。</p>' +
        '<div class="plan"><ul>' + plan.map(function (p) {
          return '<li><span class="d">' + esc(label(fromKey(p.date))) + '　<span class="t">' + esc(p.time) + '</span></span><span>' + esc(p.title) + '</span></li>';
        }).join('') + '</ul></div>' +
        '<div class="why"><h3>こう考えました</h3><ul>' +
          (b.why || []).map(function (r) { return '<li>' + esc(r[0]) + ' <span class="from">' + esc(r[1]) + '</span></li>'; }).join('') +
        '</ul></div>' +
        (b.status === 'pending'
          ? '<p class="wait-note">まだ予定には入れていません。よろしければ登録します。</p>' +
            '<div class="actions">' +
              '<button class="btn block" data-act="approve-plan" data-id="' + b.id + '">この予定で登録する</button>' +
              (b.evening ? '' : '<button class="btn secondary block" data-act="say" data-text="ウォーキングは夕方にして">ウォーキングは夕方に</button>') +
              '<button class="btn quiet block" data-act="decline" data-id="' + b.id + '">今回はやめておく</button>' +
            '</div>'
          : b.status === 'approved' ? '<p class="done-note">✓ 登録しました</p>'
          : b.status === 'superseded' ? '<p class="wait-note">この案は、下の新しい案に置きかえました。</p>'
          : '<p class="wait-note">この提案は見送りました。</p>') +
      '</div>';
    }
    if (b.kind === 'carry') {
      var ts = b.ids.map(function (id) { return state.tasks.find(function (t) { return t.id === id; }); }).filter(Boolean);
      return '<div class="bubble wide" data-testid="carry-card">' +
        '<p>昨日できなかったことが <b>' + ts.length + '件</b> あります。明日の' + esc(label(TOMORROW)) + 'に回してよいですか？</p>' +
        '<div class="plan"><ul>' + ts.map(function (t) { return '<li><span class="d">やること</span><span>' + esc(t.title) + '</span></li>'; }).join('') + '</ul></div>' +
        (b.status === 'pending'
          ? '<div class="actions"><button class="btn block" data-act="approve-carry" data-id="' + b.id + '">明日に回す</button>' +
            '<button class="btn quiet block" data-act="decline" data-id="' + b.id + '">そのままにする</button></div>'
          : b.status === 'approved' ? '<p class="done-note">✓ 明日に回しました</p>' : '<p class="wait-note">そのままにしました。</p>') +
      '</div>';
    }
    return '';
  }
  // 提案カードは「出したときの条件」で描く（夕方案と朝案を混ぜない）
  function buildPlanFor(b) {
    var saved = state.walkEvening; state.walkEvening = b.evening;
    var p = buildPlan(); state.walkEvening = saved;
    if (b.review) p.forEach(function (x) { if (x.kind === 'review') x.time = b.review; });
    return p;
  }
  // 提案の理由は、そのとき覚えていることから組み立てる（忘れたことは理由に使わない）
  function planReasons() {
    var r = [];
    if (remembers(/30分/)) r.push(['歩くのは30分くらいが続けやすい、と伺っています', '覚えていること']);
    if (state.walkEvening) r.push(['ご希望に合わせて、ウォーキングは夕方にしました', '会話']);
    if (remembers(/午後/)) r.push(['学ぶのは午後のほうが集中できるので、大学は15時から', '覚えていること']);
    r.push(['通院と会食の日時は避けました', '予定']);
    r.push(['大学は「予防栄養学の基礎」の続き（第4回・第5回）', '大学']);
    if (remembers(/日曜の夜/)) r.push(['日曜の夜はご家族と電話されることが多いので、ふりかえりは16時に', '覚えていること']);
    return r;
  }

  function renderChat(scroll) {
    if (document.body.getAttribute('data-screen') !== 'chat') { if (scroll === true) return; }
    var msgs = state.chat.map(function (m) {
      if (m.who === 'me') return '<div class="msg me"><div class="bubble">' + esc(m.text) + '</div></div>';
      return '<div class="msg ai"><div class="avatar" aria-hidden="true">AI</div>' + chatBody(m) + '</div>';
    }).join('');
    var opening = '<div class="msg ai"><div class="avatar" aria-hidden="true">AI</div><div class="bubble">' + NAME + 'さん、何をお手伝いしましょう？<br>予定・やること・大学のことなど、ふだんの言葉で話しかけてください。</div></div>';
    view.innerHTML =
      '<h1 class="section-title" style="margin-top:0">AIと話す</h1>' +
      '<div class="chat" id="chat">' + opening + msgs +
        (state.typing ? '<div class="msg ai"><div class="avatar" aria-hidden="true">AI</div><div class="bubble typing" aria-label="考えています"><span></span><span></span><span></span></div></div>' : '') +
      '</div>' +
      '<section class="examples"><h2>話しかける例（押すと送ります）</h2><div class="chips">' +
        EXAMPLES.map(function (e) { return '<button class="chip' + (e.lead && !planApproved() ? ' lead-chip' : '') + '" data-act="say" data-text="' + esc(e.text) + '">' + esc(e.text) + '</button>'; }).join('') +
      '</div></section>' +
      '<form class="composer" id="composer" autocomplete="off">' +
        '<button type="button" class="btn secondary icon-btn" data-act="mic" aria-label="声で話しかける">' + ICON.mic + '</button>' +
        '<input id="say" type="text" placeholder="文字でも入力できます" aria-label="AIへのメッセージ">' +
        '<button type="submit" class="btn icon-btn" aria-label="送る">' + ICON.send + '</button>' +
      '</form>';
    if (scroll === true) {
      var last = view.querySelector('.chat .msg:last-child');
      if (last) last.scrollIntoView({ block: 'start' });
    }
  }

  function renderSchedule() {
    function day(d) {
      var evs = eventsOn(key(d));
      return '<section class="day' + (key(d) === key(TODAY) ? ' is-today' : '') + '"><h2>' + esc(label(d)) + (key(d) === key(TODAY) ? '　今日' : '') + '</h2>' +
        (evs.length ? evs.map(function (e) {
          return '<div class="ev' + (e.ai ? ' ai' : '') + '"' + (e.ai ? ' data-ai="1"' : '') + '><span class="time">' + esc(e.time) + '</span><span class="title"><span>' + esc(e.title) + '</span>' + (e.ai ? '<span class="badge-ai">AIが追加</span>' : '') + '</span></div>';
        }).join('') : '<p class="empty">予定はありません</p>') +
      '</section>';
    }
    var html = '<h1 class="section-title" style="margin-top:0">予定</h1>' +
      '<p class="lead">AIが追加した予定には <span class="badge-ai">AIが追加</span> と表示します。追加するのは、' + NAME + 'さんが承認したときだけです。</p>';
    html += '<p class="week-label">今週</p>';
    for (var d = new Date(TODAY); d < NEXT_MON; d = addDays(d, 1)) html += day(d);
    html += '<p class="week-label">来週</p>';
    for (var i = 0; i < 7; i++) html += day(addDays(NEXT_MON, i));
    if (!planApproved()) html += '<div class="card" style="margin-top:22px"><p>来週の運動と勉強の時間を、AIと一緒に決めませんか？</p><button class="btn" style="margin-top:12px" data-act="consult">AIに相談する</button></div>';
    view.innerHTML = html;
  }

  function renderTasks() {
    function group(title, d) {
      var ts = tasksOn(key(d));
      return '<h2 class="section-title">' + esc(title) + '　<span class="small">' + esc(label(d)) + '</span></h2>' +
        (ts.length ? ts.map(function (t) {
          return '<button class="task' + (t.done ? ' done' : '') + '" data-act="toggle-task" data-id="' + t.id + '" aria-pressed="' + t.done + '">' +
            '<span class="check">' + ICON.check + '</span><span class="label">' + esc(t.title) + '</span>' +
            (t.moved ? '<span class="badge-ai moved">昨日から</span>' : '') + '</button>';
        }).join('') : '<p class="empty">ありません</p>');
    }
    var left = movableTasks().length;
    view.innerHTML = '<h1 class="section-title" style="margin-top:0">やること</h1>' +
      '<p class="lead">終わったら、押して印をつけます。</p>' +
      group('昨日', YESTERDAY) + group('今日', TODAY) + group('明日', TOMORROW) +
      (left ? '<div class="card" style="margin-top:22px"><p>昨日できなかったことが ' + left + '件あります。</p><button class="btn" style="margin-top:12px" data-act="say-go" data-text="昨日できなかったことを明日に回して">AIに「明日に回して」と頼む</button></div>' : '');
  }

  function renderUniv() {
    var nextU = state.events.filter(function (e) { return e.univ && fromKey(e.date) > TODAY; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
    view.innerHTML = '<h1 class="section-title" style="margin-top:0">' + NAME + 'さんの大学</h1>' +
      '<p class="lead">学びたいことに合わせて、世界中の知識からAIが講座を組み立てます。学んだことは「覚えていること」に残り、次の提案に生かされます。</p>' +
      '<div class="stack" style="margin-top:18px">' +
        '<article class="card course"><h2>予防栄養学の基礎</h2><p class="small">全8回・1回45分</p>' +
          '<div class="progress" role="img" aria-label="8回中2回を受講"><span style="width:25%"></span></div><p class="small">2回受講ずみ・今日14時に第3回</p>' +
          '<div class="sources"><span>大学の公開講座</span><span>公的機関の資料</span><span>専門家の解説動画</span></div>' +
          (nextU
            ? '<div class="next ok"><p><b>次の授業</b>　' + esc(label(fromKey(nextU.date)) + ' ' + nextU.time) + '<br>予定に入っています。</p></div>'
            : '<div class="next"><p><b>第4回</b>は、まだ予定に入っていません。</p><button class="btn" data-act="consult">AIに時間を相談する</button></div>') +
        '</article>' +
        '<article class="card course"><h2>AIを暮らしに生かす</h2><p class="small">全6回・1回30分</p>' +
          '<div class="progress" role="img" aria-label="6回中1回を受講"><span style="width:17%"></span></div><p class="small">1回受講ずみ</p>' +
          '<div class="sources"><span>入門講座</span><span>実際の使い方の例</span></div>' +
        '</article>' +
        '<div class="card"><p><b>学びたいことを、ふつうの言葉で</b></p><p class="small" style="margin-top:4px">例：「地元の歴史を学びたい」「孫と話せるように英語をやり直したい」。AIが講座を組み立て、空いている時間に入れる案を出します。</p></div>' +
      '</div>';
  }

  function renderMemory() {
    var editing = state.editing;
    view.innerHTML = '<h1 class="section-title" style="margin-top:0">覚えていること</h1>' +
      '<p class="lead">AIが' + NAME + 'さんについて覚えていることです。提案はここをもとにつくります。直すことも、消すこともできます。</p>' +
      state.candidates.map(function (c) {
        return '<section class="card candidate" style="margin-top:18px" data-testid="candidate"><h2>新しく覚えてよいですか？</h2>' +
          '<p class="quote">「' + esc(c.text) + '」</p><p class="small">' + esc(c.src) + '</p>' +
          '<div class="row" style="margin-top:12px"><button class="btn" data-act="mem-accept" data-id="' + c.id + '">覚える</button><button class="btn secondary" data-act="mem-reject" data-id="' + c.id + '">覚えない</button></div></section>';
      }).join('') +
      '<h2 class="section-title">いま覚えていること　<span class="small" data-testid="mem-count">' + state.memories.length + '件</span></h2>' +
      '<div class="card" style="padding-top:4px;padding-bottom:4px" id="mem-list">' +
        (state.memories.length ? state.memories.map(function (m) {
          if (editing === m.id) {
            return '<div class="mem" data-id="' + m.id + '"><label class="small" for="mem-edit">内容を直す</label><input id="mem-edit" value="' + esc(m.text) + '">' +
              '<div class="row"><button class="btn" data-act="mem-save" data-id="' + m.id + '">保存する</button><button class="btn quiet" data-act="mem-cancel">やめる</button></div></div>';
          }
          return '<div class="mem" data-id="' + m.id + '"><p class="text">' + esc(m.text) + '</p><p class="src">' + esc(m.src) + '</p>' +
            '<div class="row"><button class="btn secondary" data-act="mem-edit" data-id="' + m.id + '">直す</button><button class="btn quiet" data-act="mem-del" data-id="' + m.id + '">忘れてもらう</button></div></div>';
        }).join('') : '<p class="empty">覚えていることはありません</p>') +
      '</div>' +
      '<p class="promise">AIが覚えるのは、' + NAME + 'さんが「覚える」を押したことだけです。ここにないことを、勝手に覚えたり使ったりはしません。</p>';
  }

  function renderAdd() {
    view.innerHTML = '<h1 class="section-title" style="margin-top:0">機能をふやす</h1>' +
      '<p class="lead">みんなに同じ機能を配るのではなく、' + NAME + 'さんに必要なものだけを足していけます。AIと記憶は共通なので、足した機能もすぐに予定や提案とつながります。</p>' +
      '<div class="stack" style="margin-top:18px">' +
      FEATURES.map(function (f) {
        var on = state.features[f.id];
        return '<div class="card feature">' + ICON[f.id] + '<div class="body"><h2>' + esc(f.name) + '</h2><p>' + esc(f.desc) + '</p></div>' +
          '<button class="btn' + (on ? ' quiet' : ' secondary') + '" data-act="feature" data-id="' + f.id + '" aria-pressed="' + on + '">' + (on ? '追加ずみ' : '追加する') + '</button></div>';
      }).join('') +
      '</div><p class="small" style="margin-top:18px">※試作版では、追加すると「今日」のメニューに並びます。中身はこれからの開発で作ります。</p>';
  }

  // ---------- 操作 ----------
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]'); if (!el) return;
    var act = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    switch (act) {
      case 'close-guide': state.guideClosed = true; save(); renderToday(); break;
      case 'consult': goChat('来週の予定に、運動と大学の勉強を組み込んで'); break;
      case 'say': send(el.getAttribute('data-text')); break;
      case 'say-go': goChat(el.getAttribute('data-text')); break;
      case 'approve-plan': approvePlan(id); break;
      case 'approve-carry': approveCarry(id); break;
      case 'decline': decline(id); break;
      case 'mic': toast('製品版では、声で話しかけるだけで使えます'); break;
      case 'toggle-task':
        var t = state.tasks.find(function (x) { return x.id === id; });
        if (t) { t.done = !t.done; save(); renderTasks(); }
        break;
      case 'mem-accept':
        var c = state.candidates.find(function (x) { return x.id === id; });
        if (c) { state.memories.unshift({ id: nid('m'), text: c.text, src: c.src + '（承認ずみ）' }); }
        state.candidates = state.candidates.filter(function (x) { return x.id !== id; });
        save(); renderMemory(); toast('覚えました'); break;
      case 'mem-reject':
        state.candidates = state.candidates.filter(function (x) { return x.id !== id; });
        save(); renderMemory(); toast('覚えずに終えました'); break;
      case 'mem-edit': state.editing = id; renderMemory(); var inp = document.getElementById('mem-edit'); if (inp) inp.focus(); break;
      case 'mem-cancel': state.editing = null; renderMemory(); break;
      case 'mem-save':
        var v = document.getElementById('mem-edit').value.trim();
        var m = state.memories.find(function (x) { return x.id === id; });
        if (m && v) { m.text = v; m.src = '本人が直しました'; }
        state.editing = null; save(); renderMemory(); toast('直しました'); break;
      case 'mem-del':
        state.memories = state.memories.filter(function (x) { return x.id !== id; });
        save(); renderMemory(); toast('忘れました。今後の提案には使いません'); break;
      case 'feature':
        state.features[id] = !state.features[id]; save(); renderAdd();
        toast(state.features[id] ? '「今日」のメニューに追加しました' : 'メニューから外しました'); break;
      case 'soon': toast('「' + el.getAttribute('data-name') + '」は、これからの開発で作ります'); break;
      case 'reset':
        try { localStorage.removeItem(STORE_KEY); } catch (e) { /* noop */ }
        state = load(); state.typing = false; state.editing = null; route(); toast('最初の状態にもどしました'); break;
    }
  });

  document.addEventListener('submit', function (ev) {
    if (ev.target.id !== 'composer') return;
    ev.preventDefault();
    var inp = document.getElementById('say');
    var text = inp.value; inp.value = '';
    send(text);
  });

  function goChat(text) {
    if (location.hash !== '#/chat') {
      location.hash = '#/chat';
      setTimeout(function () { send(text); }, 50);
    } else { send(text); }
  }

  window.addEventListener('hashchange', route);
  route();
})();
