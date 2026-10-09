/* My Second Place AI — Personal Life OS プロトタイプ v0.2
 * 記録（予定・やること・健康・日記・写真・情報源・投資・人生の記録・大学）はブラウザ内に保存する。
 * AIの返事は決めておいた台本で返す（本物のAIには接続しない）。
 * 予定・やること・記憶・学部を変えるのは、本人が承認したときだけ。 */
(function () {
  'use strict';

  var STORE_KEY = 'msp-ai-demo-v2';
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
  function md(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }

  var TODAY = startOfDay(new Date());
  var YESTERDAY = addDays(TODAY, -1);
  var TOMORROW = addDays(TODAY, 1);
  var NEXT_MON = addDays(TODAY, ((8 - TODAY.getDay()) % 7) || 7);
  function nextWeek(dow) { return addDays(NEXT_MON, (dow + 6) % 7); } // dow: 0=日 … 6=土
  function daysAgo(n) { return key(addDays(TODAY, -n)); }

  // ---------- 機能の一覧（Personal Life OS） ----------
  var MODULES = [
    { id: 'schedule', name: '予定', desc: '予定・予約・リマインド', icon: 'cal', route: 'schedule' },
    { id: 'tasks', name: 'やること', desc: '日々の行動と目標', icon: 'task', route: 'tasks' },
    { id: 'health', name: '健康', desc: '食事・運動・睡眠・体重', icon: 'health', route: 'health' },
    { id: 'univ', name: '大学', desc: '世界中の知識で学ぶ', icon: 'univ', route: 'univ' },
    { id: 'diary', name: '日記', desc: '毎日の出来事と記憶', icon: 'diary', route: 'diary' },
    { id: 'photo', name: '写真', desc: '思い出の整理', icon: 'photo', route: 'photo' },
    { id: 'feeds', name: '関心情報', desc: 'コミュニティ・推し活・動画・音声', icon: 'community', route: 'feeds' },
    { id: 'invest', name: '投資', desc: '資産・市場・情報', icon: 'invest', route: 'invest' },
    { id: 'life', name: '人生の記録', desc: '価値観・経験・目標', icon: 'life', route: 'life' }
  ];
  function mod(id) { return MODULES.filter(function (m) { return m.id === id; })[0]; }

  // ---------- 大学の初期データ ----------
  function lec(id, title, src, points, terms, quiz) {
    return { id: id, title: title, src: src, done: false, points: points, terms: terms || [], quiz: quiz || null };
  }
  function doneLec(l) { l.done = true; return l; }
  function seedUniv() {
    return [
      { id: 'f1', name: '健康長寿学部', desc: '食事・栄養、運動、睡眠、健康習慣を体系的に学ぶ', courses: [
        { id: 'c1', name: '予防栄養学の基礎', plan: '全8回・1回45分', lectures: [
          doneLec(lec('l1', '第1回　食事と体のつながり', 'YouTube（大学の公開講座の例）', ['毎日の食事は、体をつくる材料になる', '一度に変えるより、続けられる小さな工夫が大切とされている', '気になる体の変化は、医師に相談する'], [['栄養素', '食べ物にふくまれ、体の働きを助ける成分']], { q: '食事を見直すとき、よいとされる進め方はどれ？', choices: ['一度に全部を変える', '続けられる小さな工夫から始める'], answer: 1 })),
          doneLec(lec('l2', '第2回　たんぱく質と筋肉', 'Podcast（栄養の専門家の解説の例）', ['筋肉の材料のひとつが、たんぱく質', '食事と体を動かすことを組み合わせるのが大切とされている'], [['たんぱく質', '肉・魚・卵・大豆などに多い栄養素']], { q: '筋肉の材料のひとつはどれ？', choices: ['たんぱく質', '食物繊維'], answer: 0 })),
          lec('l3', '第3回　食物繊維と腸', 'YouTube（公的機関の解説動画の例）', ['野菜・海藻・きのこなどに多い', '水分も一緒にとることが大切とされている'], [['食物繊維', '体で消化されにくい成分。おなかの調子を整える働きがあるとされる']], { q: '食物繊維が多い食べ物はどれ？', choices: ['野菜・海藻・きのこ', '砂糖'], answer: 0 })
        ]},
        { id: 'c2', name: '無理なく続ける運動', plan: '全6回・1回30分', lectures: [
          lec('l4', '第1回　歩くことから始める', 'YouTube（運動指導者の解説の例）', ['自分のペースで、続けられる時間から', '体調がすぐれない日は休む'], [], null)
        ]}
      ]},
      { id: 'f2', name: 'AI・テクノロジー学部', desc: '生成AI、AIエージェント、アプリづくりを実践で学ぶ', courses: [
        { id: 'c3', name: '生成AI入門', plan: '全6回・1回30分', lectures: [
          lec('l5', '第1回　AIに話しかけてみる', 'Podcast（AI入門番組の例）', ['ふだんの言葉で頼めばよい', '答えは確かめてから使う'], [['生成AI', '文章や画像をつくるAI']], null)
        ]}
      ]},
      { id: 'f3', name: '資産形成・経済学部', desc: '資産運用、経済、金融市場、リスク、税のしくみを理解する', courses: [
        { id: 'c4', name: 'はじめての資産運用', plan: '全6回・1回30分', lectures: [
          lec('l6', '第1回　新NISAのしくみ', 'YouTube（金融機関の解説動画の例）', ['決められた投資枠の範囲内で、投資で得た利益に税金がかからない国の制度', '2024年から新しい制度になった', '投資するかどうかは、自分で決める'], [['新NISA', '少額投資非課税制度。2024年から始まった新しい形']], null)
        ]}
      ]},
      { id: 'f4', name: '人生後半デザイン学部', desc: '生きがい、心理学、コミュニティ、社会参加、趣味を探究する', courses: [
        { id: 'c5', name: '生きがいの心理学', plan: '全6回・1回30分', lectures: [
          lec('l7', '第1回　役割と居場所', 'Podcast（心理学の講義の例）', ['人は役割があると、毎日に張りが出やすい', '居場所は、家と職場のほかにもつくれる'], [], null)
        ]}
      ]}
    ];
  }

  // ---------- 初期データ ----------
  function seed() {
    var s = {
      v: 2, today: key(TODAY), guideClosed: false, seq: 100, walkEvening: false,
      active: { schedule: true, tasks: true, health: true, univ: true, diary: true, photo: true, feeds: true, invest: false, life: false },
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
        { id: 't6', date: key(TODAY), title: '第3回の教材を読んでおく', done: false },
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
      health: [],
      diary: [
        { id: 'd1', date: daysAgo(3), text: '朝の散歩で、川沿いの道に新しいベンチができていた。少し座って、季節の変わり目を感じた。' },
        { id: 'd2', date: daysAgo(2), text: '公民館の講座で、人生の後半に新しい役割を持つ話を聞いた。自分にできることを考えたい。' },
        { id: 'd3', date: daysAgo(1), text: '孫から電話。運動会の練習をがんばっているらしい。散歩の距離を少しのばした。' }
      ],
      photos: [
        { id: 'p1', date: daysAgo(3), memo: '川沿いの散歩道', art: 'walk' },
        { id: 'p2', date: daysAgo(2), memo: '公民館の講座のテキスト', art: 'book' },
        { id: 'p3', date: daysAgo(6), memo: '家庭菜園のミニトマト', art: 'garden' }
      ],
      sources: [
        { id: 's1', type: 'community', name: '朝歩こう会（地域のウォーキング会）', note: '毎週土曜 9:00 公園に集合' },
        { id: 's2', type: 'community', name: '公民館の囲碁サークル', note: '初心者歓迎' },
        { id: 's3', type: 'oshi', name: '好きな落語家の公演情報', note: '新しい公演が出たら知りたい' },
        { id: 's4', type: 'youtube', name: '栄養学の公開講座チャンネル', note: '大学の教材候補' },
        { id: 's5', type: 'podcast', name: '人生後半の学び番組', note: '散歩しながら聞く' }
      ],
      invest: [],
      life: [],
      univ: seedUniv(),
      chat: []
    };
    var steps = [5200, 6800, 4100, 7300, 3900, 6200, 2800], weight = [64.6, 64.4, 64.5, 64.3, 64.2, 64.3, 64.1], sleep = [6.5, 7, 6, 7.5, 6.5, 7, 6.5];
    for (var i = 6; i >= 0; i--) {
      s.health.push({ id: 'h' + i + 'a', date: daysAgo(i), kind: 'steps', value: steps[6 - i] });
      s.health.push({ id: 'h' + i + 'b', date: daysAgo(i), kind: 'weight', value: weight[6 - i] });
      s.health.push({ id: 'h' + i + 'c', date: daysAgo(i), kind: 'sleep', value: sleep[6 - i] });
    }
    s.health.push({ id: 'hm1', date: daysAgo(0), kind: 'meal', value: '朝：ごはん・みそ汁・納豆' });
    s.health.push({ id: 'hm2', date: daysAgo(1), kind: 'exercise', value: 'いすスクワット 10回×2' });
    return s;
  }

  var state;
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) { var s = JSON.parse(raw); if (s && s.v === 2 && s.today === key(TODAY)) return s; }
    } catch (e) { /* 保存が使えない環境でも動かす */ }
    return seed();
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { toast('この端末では保存できませんでした（写真が大きすぎる可能性があります）'); } }
  function nid(p) { state.seq += 1; return p + state.seq; }
  function fresh() { state.typing = false; state.editing = null; }
  state = load(); fresh();

  // ---------- 小道具 ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // 「第4回（45分）」のような語の途中で行が割れないようにする
  function t(s) { return esc(s).replace(/(第\d+回(?:（\d+分）)?|\d+分)/g, '<span class="nw">$1</span>'); }
  function find(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
  function mins(time) { var p = time.split(':'); return +p[0] * 60 + +p[1]; }
  function byTime(a, b) { return mins(a.time) - mins(b.time); }
  function eventsOn(k) { return state.events.filter(function (e) { return e.date === k; }).sort(byTime); }
  function tasksOn(k) { return state.tasks.filter(function (x) { return x.date === k; }); }
  function remembers(re) { return state.memories.some(function (m) { return re.test(m.text); }); }
  function healthOf(kind) { return state.health.filter(function (h) { return h.kind === kind; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }); }
  // 今日はまだ途中なので、きのうまでの6日で数える
  function avgSteps() {
    var from = daysAgo(6), to = daysAgo(1), xs = healthOf('steps').filter(function (h) { return h.date >= from && h.date <= to; });
    if (!xs.length) return 0;
    return Math.round(xs.reduce(function (a, h) { return a + +h.value; }, 0) / xs.length);
  }
  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3200);
  }
  function head(title, lead) {
    return '<h1 class="page-title">' + esc(title) + '</h1>' + (lead ? '<p class="lead">' + lead + '</p>' : '');
  }

  var ICON = {
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    task: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12.5l3 3 5.5-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    univ: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    all: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-2.5-6.5z" fill="currentColor"/></svg>',
    health: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2-5 4 10 2-5h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    diary: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h11a2 2 0 0 1 2 2v16H8a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 8h6M10 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    photo: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    community: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16.5" cy="9" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.5 19c.8-3 3-4.5 5.5-4.5S12.7 16 13.5 19M14 14.8c2.6-.8 5.6.4 6.5 3.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    invest: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20h18M5 16l5-5 3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    life: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M12 7c-3-3-7-2-8 1 3 0 6 1 8 4 2-3 5-4 8-4-1-3-5-4-8-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  var SOURCE_TYPES = { community: 'コミュニティ', oshi: '推し活', youtube: 'YouTube', podcast: 'Podcast', news: 'ニュース' };
  var FEED_EXAMPLES = {
    s1: '今週の土曜 9:00、中央公園の東口に集合。初めての方は30分コースから。',
    s2: '来月、初心者向けの体験会があります。',
    s3: '年末に近くのホールで独演会の予定が出ました。',
    s4: '新しい講義「食事の記録のつけ方」が公開されました。',
    s5: '最新回：「定年後の学び直し、何から始める？」'
  };
  var HEALTH_KINDS = { steps: ['歩数', '歩'], weight: ['体重', 'kg'], sleep: ['睡眠', '時間'], meal: ['食事', ''], exercise: ['運動', ''] };

  // ---------- 台本（AIの返事） ----------
  function walkTime() { return state.walkEvening ? '16:30' : '7:00'; }
  function walkTitle() { return remembers(/30分/) ? 'ウォーキング 30分' : 'ウォーキング'; }
  function studyTime() { return remembers(/午後/) ? '15:00' : '13:30'; }
  function reviewTime() { return remembers(/日曜の夜/) ? '16:00' : '19:00'; }
  function buildPlan() {
    var w = walkTime();
    return [
      { date: key(nextWeek(1)), time: w, title: walkTitle(), kind: 'walk' },
      { date: key(nextWeek(2)), time: studyTime(), title: '大学「予防栄養学の基礎」第4回（45分）', kind: 'univ', univ: true },
      { date: key(nextWeek(3)), time: w, title: walkTitle(), kind: 'walk' },
      { date: key(nextWeek(4)), time: studyTime(), title: '大学「予防栄養学の基礎」第5回（45分）', kind: 'univ', univ: true },
      { date: key(nextWeek(6)), time: w, title: walkTitle(), kind: 'walk' },
      { date: key(nextWeek(0)), time: reviewTime(), title: '1週間のふりかえり（健康と学び）', kind: 'review' }
    ];
  }
  function planApproved() { return state.events.some(function (e) { return e.ai && e.plan; }); }
  function movableTasks() { return state.tasks.filter(function (x) { return x.date === key(YESTERDAY) && !x.done; }); }
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

  var EXAMPLES = [
    { text: '来週の予定に、運動と大学の勉強を組み込んで', lead: true },
    { text: '最近運動不足だから、何か始めたい' },
    { text: '地元の歴史を学ぶ学部をつくって' },
    { text: '今週の日記から、気づいたことは？' },
    { text: '昨日できなかったことを明日に回して' },
    { text: '新NISAってなに？' },
    { text: '私について覚えていることを教えて' }
  ];

  function intentOf(text) {
    var x = text.replace(/\s/g, '');
    if (/夕方/.test(x) && /(歩|ウォーキング|運動)/.test(x)) return 'evening';
    if (/(運動不足|何か始め|体を動か)/.test(x)) return 'exercise';
    if (/(学部|学びたい|カリキュラム|を学ぶ)/.test(x)) return 'faculty';
    if (/(組み込|計画|入れて|考えて)/.test(x)) return 'plan';
    if (/(回して|できなかった|残った)/.test(x)) return 'carry';
    if (/(日記|気づ|ふりかえ|振り返)/.test(x)) return 'diary';
    if (/(NISA|ニーサ|投資)/i.test(x)) return 'invest';
    if (/(ってなに|とは)/.test(x)) return 'term';
    if (/木曜/.test(x)) return 'thu';
    if (/(大学|授業|講座|勉強)/.test(x)) return 'univ';
    if (/覚え/.test(x)) return 'me';
    return 'other';
  }

  function topicOf(text) {
    if (/歴史/.test(text)) return { name: '郷土の歴史学部', courses: ['まちの成り立ち', '昔の暮らしと道具', '史跡を歩く'] };
    if (/英語|英会話/.test(text)) return { name: '英会話やり直し学部', courses: ['あいさつと自己紹介', '旅先の英語', '孫と話す英語'] };
    var m = text.match(/(.+?)を学/);
    var name = m ? m[1].replace(/^.*の/, '').slice(0, 10) : '新しい学び';
    return { name: name + '学部', courses: [name + 'の入門', name + 'を深める', name + 'を暮らしに生かす'] };
  }

  function reply(text) {
    var intent = intentOf(text);
    switch (intent) {
      case 'plan':
      case 'evening':
        if (intent === 'evening') state.walkEvening = true;
        if (planApproved()) return { kind: 'text', html: '来週の運動と勉強は、もう予定に入っています。<a href="#/schedule">予定を見る</a>と確かめられます。' };
        supersede('plan');
        return { kind: 'plan', id: nid('p'), status: 'pending', evening: !!state.walkEvening, review: reviewTime(), why: planReasons() };
      case 'exercise':
        var wc = state.events.filter(function (e) { return e.walkClub; })[0];
        if (wc) return { kind: 'text', html: '来週土曜の「' + esc(wc.title) + '」は、もう予定に入っています。<a href="#/schedule">予定を見る</a>' };
        supersede('exercise');
        return { kind: 'exercise', id: nid('x'), status: 'pending', avg: avgSteps(), thirty: remembers(/30分/), club: state.sources.some(function (s) { return /朝歩こう会/.test(s.name); }) };
      case 'faculty':
        supersede('faculty');
        var tp = topicOf(text);
        return { kind: 'faculty', id: nid('f'), status: 'pending', name: tp.name, courses: tp.courses };
      case 'carry':
        var mv = movableTasks();
        if (!mv.length) return { kind: 'text', html: '昨日のやることは、すべて片づいています。おつかれさまでした。' };
        supersede('carry');
        return { kind: 'carry', id: nid('c'), status: 'pending', ids: mv.map(function (x) { return x.id; }) };
      case 'diary':
        var from = daysAgo(6), ds = state.diary.filter(function (d) { return d.date >= from; });
        if (!ds.length) return { kind: 'text', html: 'この1週間の日記は、まだありません。<a href="#/diary">日記を書く</a>' };
        var words = ['散歩', '講座', '孫', '役割', '家族', '大学', '運動'].filter(function (w) { return ds.some(function (d) { return d.text.indexOf(w) >= 0; }); });
        return { kind: 'text', html: 'この1週間の日記は <b>' + ds.length + '件</b> です。よく出てくる言葉は「' + esc(words.slice(0, 3).join('」「') || 'なし') + '」でした。<br>' +
          (words.indexOf('役割') >= 0 ? '公民館の講座のあとに「自分にできることを考えたい」と書かれていますね。人生後半デザイン学部の「役割と居場所」の講義が参考になりそうです。<br><a href="#/lecture/f4/c5/l7">講義を開く</a>' : '<a href="#/diary">日記を見る</a>') };
      case 'invest':
        return { kind: 'text', html: '新NISAは、年間の投資枠などの範囲内で、投資で得た利益に税金がかからない国の制度です。2024年から新しい形になりました。<br>くわしくは、資産形成・経済学部の講義で学べます。投資するかどうかの判断は、ご自身でなさってください。<br><a href="#/lecture/f3/c4/l6">講義を開く</a>' };
      case 'term':
        return { kind: 'text', html: 'ことばの意味を、やさしく説明します。この試作版では「新NISAってなに？」で試せます。製品版では、わからないことばを大学の講義につなぎます。' };
      case 'thu':
        var thu = nextWeek(4), evs = eventsOn(key(thu));
        var busy = evs.length ? evs.map(function (e) { return e.time + '〜 ' + e.title; }).join('、') : '予定は入っていません';
        return { kind: 'text', html: esc(label(thu)) + 'は、' + esc(busy) + '。<br>朝7時ごろなら空いています。' + (remembers(/30分/) ? 'いつもの30分のウォーキングはいかがですか？' : 'ウォーキングはいかがですか？') };
      case 'univ':
        var nu = nextUniv();
        if (nu) return { kind: 'text', html: '次の授業は <b>' + esc(label(fromKey(nu.date)) + ' ' + nu.time) + '</b> の「' + t(nu.title.replace(/^大学「予防栄養学の基礎」/, '')) + '」です。<br><a href="#/univ">大学を開く</a>' };
        return { kind: 'text', html: '今日の14時の第3回のあと、第4回はまだ予定に入っていません。<br>「来週の予定に、運動と大学の勉強を組み込んで」と言っていただければ、空いている時間を探します。' };
      case 'me':
        if (!state.memories.length) return { kind: 'text', html: 'いまは、覚えていることはありません。覚えてほしいことがあれば、話しかけてください。<br><a href="#/memory">覚えていることを見る</a>' };
        return { kind: 'text', html: 'いま覚えていることは ' + state.memories.length + ' 件です。たとえば「' + esc(state.memories[0].text) + '」など。<br>直したいこと・忘れてほしいことは、いつでも変えられます。<br><a href="#/memory">覚えていることを見る</a>' };
      default:
        return { kind: 'text', html: 'この試作版では、下の「話しかける例」から試せます。<br>製品版では、どんな言い方でも受けとめて、記録や予定に落とし込みます。' };
    }
  }
  function nextUniv() {
    return state.events.filter(function (e) { return e.univ && fromKey(e.date) > TODAY; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
  }
  // 同じ種類の、まだ決めていない提案は新しいものに置きかえる（古い案で実行できないようにする）
  function supersede(kind) {
    state.chat.forEach(function (m) { if (m.body && m.body.kind === kind && m.body.status === 'pending') m.body.status = 'superseded'; });
  }

  function send(text) {
    if (!text || !text.trim()) return;
    state.chat.push({ who: 'me', text: text.trim() });
    state.typing = true; save(); renderChat(true);
    setTimeout(function () {
      state.typing = false;
      state.chat.push({ who: 'ai', body: reply(text) });
      save(); renderChat(true);
    }, 900);
  }
  function aiSays(html) { state.chat.push({ who: 'ai', body: { kind: 'text', html: html } }); }
  function findMsg(id) { return state.chat.filter(function (m) { return m.body && m.body.id === id; })[0]; }

  // ---------- 承認 ----------
  var APPROVE = {
    plan: function (b) {
      if (planApproved()) return false;
      buildPlanFor(b).forEach(function (p) { state.events.push({ id: nid('e'), date: p.date, time: p.time, title: p.title, ai: true, plan: true, univ: !!p.univ }); });
      aiSays('来週の予定に <b>6件</b> 登録しました。前の日の夜に、お知らせします。<br><a href="#/schedule">予定を見る</a>');
      toast('予定に6件を登録しました'); return true;
    },
    exercise: function (b) {
      if (state.events.some(function (e) { return e.walkClub; })) return false;
      state.events.push({ id: nid('e'), date: key(nextWeek(6)), time: '9:00', title: b.club ? '朝歩こう会に体験参加' : '朝のウォーキング', ai: true, walkClub: true });
      state.tasks.push({ id: nid('t'), date: key(nextWeek(5)), title: '歩きやすい靴と水筒を用意', done: false, ai: true });
      aiSays('来週土曜の' + (b.club ? '「朝歩こう会」' : '朝のウォーキング') + 'を予定に入れ、前の日のやることに「歩きやすい靴と水筒を用意」を足しました。<br><a href="#/schedule">予定を見る</a>');
      toast('予定とやることに追加しました'); return true;
    },
    faculty: function (b) {
      var fid = nid('f');
      state.univ.push({ id: fid, name: b.name, desc: 'AIと一緒につくった、12週の学部', mine: true, courses: b.courses.map(function (c) {
        return { id: nid('c'), name: c, plan: '4週・週2回・1回30分', lectures: [lec(nid('l'), '第1回　' + c + 'の全体像', 'YouTube・Podcast・公開講座から AI が探します', ['この科目で学ぶことの見取り図', '自分の暮らしとのつながりを考える'], [], null)] };
      }) });
      aiSays('「' + esc(b.name) + '」を開きました。12週の学習計画と、最初の講義を用意しています。<br><a href="#/univ/' + fid + '">学部を開く</a>');
      toast('大学に学部を追加しました'); return true;
    },
    carry: function (b) {
      b.ids.forEach(function (tid) { var x = find(state.tasks, tid); if (x) { x.date = key(TOMORROW); x.moved = true; } });
      aiSays(b.ids.length + '件を明日のやることに回しました。<br><a href="#/tasks">やることを見る</a>');
      toast('明日のやることに回しました'); return true;
    }
  };
  function approve(id) {
    var msg = findMsg(id); if (!msg || msg.body.status !== 'pending') return;
    if (APPROVE[msg.body.kind](msg.body) === false) return;
    msg.body.status = 'approved';
    save(); renderChat(true);
  }
  function decline(id) {
    var msg = findMsg(id); if (!msg || msg.body.status !== 'pending') return;
    msg.body.status = 'declined';
    aiSays('わかりました。何も変えていません。また声をかけてください。');
    save(); renderChat(true);
  }
  function buildPlanFor(b) {
    var saved = state.walkEvening; state.walkEvening = b.evening;
    var p = buildPlan(); state.walkEvening = saved;
    if (b.review) p.forEach(function (x) { if (x.kind === 'review') x.time = b.review; });
    return p;
  }

  // ---------- 画面 ----------
  var view = document.getElementById('view');
  var ROUTES = {
    today: renderToday, chat: renderChat, all: renderAll, schedule: renderSchedule, tasks: renderTasks,
    health: renderHealth, univ: renderUniv, lecture: renderLecture, diary: renderDiary, photo: renderPhoto,
    feeds: renderFeeds, invest: renderInvest, life: renderLife, memory: renderMemory, data: renderData
  };
  var params = [];

  function route() {
    var parts = (location.hash.replace(/^#\/?/, '') || 'today').split('/');
    var name = ROUTES[parts[0]] ? parts[0] : 'today';
    params = parts.slice(1);
    document.getElementById('back').hidden = name === 'today';
    document.getElementById('talkbar').hidden = name === 'chat';
    document.body.setAttribute('data-screen', name);
    ROUTES[name]();
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
  }

  function renderToday() {
    var evs = eventsOn(key(TODAY)), tks = tasksOn(key(TODAY));
    var c1 = find(find(state.univ, 'f1').courses, 'c1');
    var doneN = c1.lectures.filter(function (l) { return l.done; }).length;
    var tiles = [['#/schedule', 'cal', '予定'], ['#/tasks', 'task', 'やること'], ['#/health', 'health', '健康'], ['#/univ', 'univ', '大学'], ['#/diary', 'diary', '日記'], ['#/all', 'all', 'すべて']];
    var hint = planApproved()
      ? '来週の運動と勉強の予定が入りました。前の日の夜に、お知らせしますね。'
      : '来週の予定に、まだ空きがあります。運動と大学の勉強の時間を、一緒に考えましょうか？';
    view.innerHTML =
      '<section class="hello">' +
        '<p class="date">' + esc(label(TODAY)) + '</p>' +
        '<h1>こんにちは！ ' + NAME + 'さん</h1>' +
        '<p class="sub">今日も、自分らしい一日を。</p>' +
      '</section>' +
      '<div class="today-grid">' +
        '<a class="card stat" href="#/schedule" data-testid="stat-events"><span class="stat-label">今日の予定</span><span class="stat-num">' + evs.length + '<small>件</small></span></a>' +
        '<a class="card stat" href="#/tasks" data-testid="stat-tasks"><span class="stat-label">今日のタスク</span><span class="stat-num">' + tks.length + '<small>件</small></span></a>' +
      '</div>' +
      '<div class="tiles six">' +
        tiles.map(function (x) { return '<a class="tile" href="' + x[0] + '">' + ICON[x[1]] + '<span>' + x[2] + '</span></a>'; }).join('') +
      '</div>' +
      '<section class="ai-hint"><div class="avatar" aria-hidden="true">AI</div><div><p>' + esc(hint) + '</p>' +
        (planApproved() ? '<a class="btn secondary" href="#/schedule">来週の予定を見る</a>' : '<button class="btn" data-act="consult">相談する</button>') +
      '</div></section>' +
      (state.guideClosed ? '' :
      '<section class="guide" aria-label="この試作版の見どころ">' +
        '<h2>はじめての方へ　3分の見どころ</h2>' +
        '<ol><li>「相談する」を押し、AIの提案を見て「<span class="nw">この予定で登録する</span>」</li><li>「AIに話しかける」で「最近運動不足だから、何か始めたい」を押す（健康・地域の会・大学をまたいだ提案）</li><li>「大学」で「次に受ける講義」を開き、小テストと「受講した」を試す</li><li>「すべて」で、人生の情報がつながる全体像を見る</li></ol>' +
        '<div class="row"><button class="btn quiet" data-act="close-guide">わかりました</button></div>' +
      '</section>') +
      '<div class="stack" style="margin-top:18px">' +
        '<a class="card summary" href="#/schedule"><div class="summary-head"><h2>今日の予定</h2></div><ul>' +
          evs.map(function (e) { return '<li><span class="time">' + esc(e.time) + '</span><span>' + t(e.title) + '</span></li>'; }).join('') + '</ul></a>' +
        '<a class="card summary" href="#/tasks"><div class="summary-head"><h2>今日のタスク</h2></div><ul>' +
          tks.map(function (x) { return '<li><span>' + (x.done ? '✓ ' : '・') + esc(x.title) + '</span></li>'; }).join('') + '</ul></a>' +
        '<a class="card summary" href="#/univ"><div class="summary-head"><h2>学びの進み具合</h2></div>' +
          '<p style="margin-top:8px">予防栄養学の基礎　<b>' + doneN + '</b> / 8回</p><div class="progress" role="img" aria-label="8回中' + doneN + '回"><span style="width:' + Math.round(doneN / 8 * 100) + '%"></span></div></a>' +
      '</div>' +
      '<div class="reset"><a class="btn quiet" href="#/data">データ管理</a></div>';
  }

  // ---- AIと話す ----
  function cardActions(b, okLabel, extra) {
    if (b.status === 'pending') {
      return '<p class="wait-note">まだ何も変えていません。よろしければ実行します。</p><div class="actions">' +
        '<button class="btn block" data-act="approve" data-id="' + b.id + '">' + okLabel + '</button>' + (extra || '') +
        '<button class="btn quiet block" data-act="decline" data-id="' + b.id + '">今回はやめておく</button></div>';
    }
    if (b.status === 'approved') return '<p class="done-note">✓ 実行しました</p>';
    if (b.status === 'superseded') return '<p class="wait-note">この案は、下の新しい案に置きかえました。</p>';
    return '<p class="wait-note">この提案は見送りました。</p>';
  }
  function why(rows) {
    return '<div class="why"><h3>こう考えました</h3><ul>' + rows.map(function (r) { return '<li>' + t(r[0]) + ' <span class="from">' + esc(r[1]) + '</span></li>'; }).join('') + '</ul></div>';
  }
  function chatBody(m) {
    var b = m.body;
    if (b.kind === 'text') return '<div class="bubble">' + b.html + '</div>';
    if (b.kind === 'plan') {
      return '<div class="bubble wide" data-testid="plan-card">' +
        '<p>来週は <b>火曜の午前に通院</b>、<b>金曜の夜に友人と会食</b>がありますね。空いている時間に、こんな計画はいかがでしょうか。</p>' +
        '<div class="plan"><ul>' + buildPlanFor(b).map(function (p) {
          return '<li><span class="d">' + esc(label(fromKey(p.date))) + '　<span class="t">' + esc(p.time) + '</span></span><span>' + t(p.title) + '</span></li>';
        }).join('') + '</ul></div>' + why(b.why || []) +
        cardActions(b, 'この予定で登録する', b.evening ? '' : '<button class="btn secondary block" data-act="say" data-text="ウォーキングは夕方にして">ウォーキングは夕方に</button>') + '</div>';
    }
    if (b.kind === 'exercise') {
      var rows = [];
      if (b.thirty) rows.push(['歩くのは30分くらいが続けやすい、と伺っています', '覚えていること']);
      if (b.club) rows.push(['ひとりより仲間と一緒のほうが続けやすいので、会への参加を提案します', 'AIの提案']);
      return '<div class="bubble wide" data-testid="exercise-card">' +
        '<p>' + NAME + 'さんの記録と関心をまたいで、合いそうなものを探しました。</p>' +
        '<div class="plan"><ul>' +
          '<li><span class="d">健康の記録</span><span>きのうまでの6日間の歩数は、1日平均 <b>' + Number(b.avg).toLocaleString('ja-JP') + '歩</b> でした</span></li>' +
          (b.club ? '<li><span class="d">関心情報（コミュニティ）</span><span>登録している「朝歩こう会」が、毎週土曜 9:00 に公園で集まっています</span></li>'
                  : '<li><span class="d">関心情報（コミュニティ）</span><span>地域の会は、まだ登録されていません。<a href="#/feeds">関心情報</a>に登録すると、ここで探します</span></li>') +
          '<li><span class="d">大学</span><span>健康長寿学部に「歩くことから始める」の講義があります<br><a href="#/lecture/f1/c2/l4">講義を開く</a></span></li>' +
        '</ul></div>' + why(rows) +
        '<p style="margin-top:12px"><b>' + esc(label(nextWeek(6))) + ' 9:00</b>　' + (b.club ? '朝歩こう会に体験参加して' : '朝のウォーキングをして') + '、前の日に「歩きやすい靴と水筒を用意」をやることに入れましょうか？</p>' +
        cardActions(b, '予定とやることに入れる') + '</div>';
    }
    if (b.kind === 'faculty') {
      return '<div class="bubble wide" data-testid="faculty-card">' +
        '<p>「' + esc(b.name) + '」の12週の学習計画をつくりました。</p>' +
        '<div class="plan"><ul>' + b.courses.map(function (c, i) {
          return '<li><span class="d">' + (i * 4 + 1) + '〜' + (i * 4 + 4) + '週目</span><span>科目「' + esc(c) + '」</span></li>';
        }).join('') + '</ul></div>' +
        why([['教材は YouTube・Podcast・公開講座から、字幕や公式の情報を使って集めます', '大学'], ['1回30分、週2回を目安にしました', 'AIの提案']]) +
        cardActions(b, 'この学部をつくる') + '</div>';
    }
    if (b.kind === 'carry') {
      var ts = b.ids.map(function (id) { return find(state.tasks, id); }).filter(Boolean);
      return '<div class="bubble wide" data-testid="carry-card">' +
        '<p>昨日できなかったことが <b>' + ts.length + '件</b> あります。明日の' + esc(label(TOMORROW)) + 'に回してよいですか？</p>' +
        '<div class="plan"><ul>' + ts.map(function (x) { return '<li><span class="d">やること</span><span>' + esc(x.title) + '</span></li>'; }).join('') + '</ul></div>' +
        cardActions(b, '明日に回す') + '</div>';
    }
    return '';
  }

  function renderChat(scroll) {
    if (scroll === true && document.body.getAttribute('data-screen') !== 'chat') return;
    var msgs = state.chat.map(function (m) {
      if (m.who === 'me') return '<div class="msg me"><div class="bubble">' + esc(m.text) + '</div></div>';
      return '<div class="msg ai"><div class="avatar" aria-hidden="true">AI</div>' + chatBody(m) + '</div>';
    }).join('');
    view.innerHTML = head('AIと話す') +
      '<div class="chat" id="chat"><div class="msg ai"><div class="avatar" aria-hidden="true">AI</div><div class="bubble">' + NAME + 'さん、何をお手伝いしましょう？<br>予定・健康・大学・日記のことなど、ふだんの言葉で話しかけてください。記録をまたいで考えます。</div></div>' + msgs +
        (state.typing ? '<div class="msg ai"><div class="avatar" aria-hidden="true">AI</div><div class="bubble typing" aria-label="考えています"><span></span><span></span><span></span></div></div>' : '') +
      '</div>' +
      '<section class="examples"><h2>話しかける例（押すと送ります）</h2><div class="chips">' +
        EXAMPLES.map(function (e) { return '<button class="chip' + (e.lead && !planApproved() ? ' lead-chip' : '') + '" data-act="say" data-text="' + esc(e.text) + '">' + esc(e.text) + '</button>'; }).join('') +
      '</div></section>' +
      '<form class="composer" id="composer" autocomplete="off">' +
        '<button type="button" class="btn secondary icon-btn" data-act="voice" data-target="say" aria-label="声で話しかける">' + ICON.mic + '</button>' +
        '<input id="say" type="text" placeholder="文字でも入力できます" aria-label="AIへのメッセージ">' +
        '<button type="submit" class="btn icon-btn" aria-label="送る">' + ICON.send + '</button>' +
      '</form>';
    if (scroll === true) { var last = view.querySelector('.chat .msg:last-child'); if (last) last.scrollIntoView({ block: 'start' }); }
  }

  // ---- すべて（Personal Life OS） ----
  function renderAll() {
    view.innerHTML = head('すべて', 'ばらばらのアプリではなく、ひとつのAIが、' + NAME + 'さんの人生の情報を横断して理解します。必要な機能だけを足していけます（育つアプリ）。') +
      '<section class="layers" aria-label="Personal Life OS の全体像">' +
        '<p class="layers-title">Personal Life OS</p>' +
        '<div class="layer l1"><b>話す・撮る・見る・聞く・尋ねる</b><span>スマホの大きくやさしい画面</span></div>' +
        '<div class="arrow" aria-hidden="true">↓</div>' +
        '<div class="layer l2"><b>AIエージェント（MulmoClaude）</b><span>記録をまたいで調べ、まとめ、提案する。実行は本人の承認のあと</span></div>' +
        '<div class="arrow" aria-hidden="true">↓</div>' +
        '<div class="layer l3"><b>機能</b><div class="modgrid">' +
          MODULES.map(function (m) {
            return state.active[m.id] ? '<a class="mod" href="#/' + m.route + '">' + ICON[m.icon] + '<span>' + esc(m.name) + '</span></a>'
                      : '<button class="mod off" data-act="toggle-mod" data-id="' + m.id + '">' + ICON.plus + '<span>' + esc(m.name) + '</span><small>足す</small></button>';
          }).join('') +
        '</div></div>' +
        '<div class="arrow" aria-hidden="true">↓</div>' +
        '<a class="layer l4" href="#/memory"><b>Personal Data &amp; Memory</b><span>個人の記録・長期記憶・知識・履歴をひとつに　→ 覚えていることを見る</span></a>' +
        '<div class="layer l5"><b>外の情報とつながる</b><span>YouTube・Podcast・ニュース・地域の催しを、許可された方法で集める</span></div>' +
      '</section>' +
      '<h2 class="section-title">機能を足す・外す</h2>' +
      '<div class="stack">' + MODULES.map(function (m) {
        var on = state.active[m.id], core = m.id === 'schedule' || m.id === 'tasks';
        return '<div class="card feature">' + ICON[m.icon] + '<div class="body"><h3>' + esc(m.name) + '</h3><p>' + esc(m.desc) + '</p></div>' +
          (core ? '<p class="small fixed">毎日使う、基本の機能です</p>' :
          '<button class="btn' + (on ? ' quiet' : ' secondary') + '" data-act="toggle-mod" data-id="' + m.id + '" aria-pressed="' + on + '">' + (on ? '使っています（外す）' : '足す') + '</button>') + '</div>';
      }).join('') + '</div>' +
      '<div class="card" style="margin-top:16px"><p><b>記録とAIの記憶は、分けて持ちます</b></p><p class="small" style="margin-top:4px">「1日6,200歩」のような数字は記録として正確に残し、「最近よく歩いている」はAIの記憶として持ちます。投資や健康の記録は、本人が確かめたものだけを正本にします。</p>' +
        '<div class="row" style="margin-top:12px"><a class="btn secondary" href="#/memory">記憶を見る</a><a class="btn secondary" href="#/data">データ管理</a></div></div>';
  }

  // ---- 予定 ----
  function renderSchedule() {
    function day(d) {
      var evs = eventsOn(key(d)), isT = key(d) === key(TODAY);
      return '<section class="day' + (isT ? ' is-today' : '') + '"><h2>' + esc(label(d)) + (isT ? '　今日' : '') + '</h2>' +
        (evs.length ? evs.map(function (e) {
          return '<div class="ev' + (e.ai ? ' ai' : '') + '"' + (e.ai ? ' data-ai="1"' : '') + '><span class="time">' + esc(e.time) + '</span><span class="title"><span>' + t(e.title) + '</span>' + (e.ai ? '<span class="badge-ai">AIが追加</span>' : '') + '</span>' +
            '<button class="icon-del" data-act="del-event" data-id="' + e.id + '" aria-label="' + esc(e.title) + 'を消す">' + ICON.trash + '</button></div>';
        }).join('') : '<p class="empty">予定はありません</p>') + '</section>';
    }
    var html = head('予定', 'AIが追加した予定には <span class="badge-ai">AIが追加</span> と表示します。追加するのは、' + NAME + 'さんが承認したときだけです。') +
      '<details class="card addform"><summary>予定を追加する</summary>' +
        '<form id="f-event" class="form"><label>日にち<input type="date" name="date" required value="' + key(TOMORROW) + '"></label>' +
        '<label>時間<input type="time" name="time" required value="10:00"></label>' +
        '<label>内容<input type="text" name="title" required placeholder="例：歯医者"></label>' +
        '<button class="btn block" type="submit">追加する</button></form></details>';
    html += '<p class="week-label">今週</p>';
    for (var d = new Date(TODAY); d < NEXT_MON; d = addDays(d, 1)) html += day(d);
    html += '<p class="week-label">来週</p>';
    for (var i = 0; i < 7; i++) html += day(addDays(NEXT_MON, i));
    if (!planApproved()) html += '<div class="card" style="margin-top:22px"><p>来週の運動と勉強の時間を、AIと一緒に決めませんか？</p><button class="btn" style="margin-top:12px" data-act="consult">AIに相談する</button></div>';
    view.innerHTML = html;
  }

  // ---- やること ----
  function renderTasks() {
    function group(title, d) {
      var ts = tasksOn(key(d));
      return '<h2 class="section-title">' + esc(title) + '　<span class="small">' + esc(label(d)) + '</span></h2>' +
        (ts.length ? ts.map(function (x) {
          return '<div class="task-row"><button class="task' + (x.done ? ' done' : '') + '" data-act="toggle-task" data-id="' + x.id + '" aria-pressed="' + x.done + '">' +
            '<span class="check">' + ICON.check + '</span><span class="label">' + esc(x.title) + '</span>' +
            (x.moved ? '<span class="badge-ai moved">昨日から</span>' : '') + '</button>' +
            '<button class="icon-del" data-act="del-task" data-id="' + x.id + '" aria-label="' + esc(x.title) + 'を消す">' + ICON.trash + '</button></div>';
        }).join('') : '<p class="empty">ありません</p>');
    }
    var left = movableTasks().length;
    view.innerHTML = head('やること', '終わったら、押して印をつけます。') +
      '<form id="f-task" class="form inline"><label class="grow">やることを追加<input type="text" name="title" required placeholder="例：薬局に行く"></label><button class="btn" type="submit">今日に追加</button></form>' +
      group('昨日', YESTERDAY) + group('今日', TODAY) + group('明日', TOMORROW) +
      (left ? '<div class="card" style="margin-top:22px"><p>昨日できなかったことが ' + left + '件あります。</p><button class="btn" style="margin-top:12px" data-act="say-go" data-text="昨日できなかったことを明日に回して">AIに「明日に回して」と頼む</button></div>' : '');
  }

  // ---- 健康 ----
  function bars(values, labels, unit) {
    var max = Math.max.apply(null, values.concat([1])), w = 320, h = 150, bw = w / values.length;
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + (h + 30) + '" role="img" aria-label="' + esc(labels.map(function (l, i) { return l + ' ' + values[i] + unit; }).join('、')) + '">' +
      values.map(function (v, i) {
        var bh = Math.max(2, v / max * (h - 26));
        return '<rect x="' + (i * bw + 7) + '" y="' + (h - bh) + '" width="' + (bw - 14) + '" height="' + bh + '" rx="4" fill="' + (i === values.length - 1 ? 'var(--brass-dark)' : 'var(--navy)') + '"/>' +
          '<text x="' + (i * bw + bw / 2) + '" y="' + (h - bh - 6) + '" text-anchor="middle" class="cv">' + (v >= 1000 ? (v / 1000).toFixed(1) + '千' : v) + '</text>' +
          '<text x="' + (i * bw + bw / 2) + '" y="' + (h + 22) + '" text-anchor="middle" class="cl">' + labels[i] + '</text>';
      }).join('') + '</svg>';
  }
  function line(values, labels, unit) {
    var w = 300, h = 140, min = Math.min.apply(null, values) - 0.3, max = Math.max.apply(null, values) + 0.3, step = w / Math.max(1, values.length - 1);
    var pts = values.map(function (v, i) { return [i * step + 20, h - (v - min) / (max - min) * (h - 40) - 10]; });
    return '<svg class="chart" viewBox="0 0 340 ' + (h + 30) + '" role="img" aria-label="' + esc(labels.map(function (l, i) { return l + ' ' + values[i] + unit; }).join('、')) + '">' +
      '<polyline points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '" fill="none" stroke="var(--brass-dark)" stroke-width="3"/>' +
      pts.map(function (p, i) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="var(--brass-dark)"/><text x="' + p[0] + '" y="' + (h + 22) + '" text-anchor="middle" class="cl">' + labels[i] + '</text>' + (i === pts.length - 1 ? '<text x="' + p[0] + '" y="' + (p[1] - 12) + '" text-anchor="end" class="cv">' + values[i] + '</text>' : ''); }).join('') + '</svg>';
  }
  function lastDays(kind, n) {
    var out = [], lab = [];
    for (var i = n - 1; i >= 0; i--) {
      var k = daysAgo(i), x = healthOf(kind).filter(function (h) { return h.date === k; }).pop();
      out.push(x ? +x.value : 0); lab.push(i === 0 ? '今日' : md(addDays(TODAY, -i)));
    }
    return [out, lab];
  }
  // きのうまでの6日で、いちばん歩数が少なかった日（今日はまだ途中なので外す）
  function lowDay(stp) {
    var i, lo = -1;
    for (i = 0; i < stp[0].length - 1; i++) if (stp[0][i] && (lo < 0 || stp[0][i] < stp[0][lo])) lo = i;
    return lo < 0 ? '' : 'いちばん少なかったのは ' + stp[1][lo] + '（' + stp[0][lo].toLocaleString('ja-JP') + '歩）でした。';
  }
  function renderHealth() {
    var st = lastDays('steps', 7), wt = lastDays('weight', 7), sl = lastDays('sleep', 7);
    var wv = wt[0].filter(Boolean), wl = wt[1].filter(function (x, i) { return wt[0][i]; });
    var notes = state.health.filter(function (h) { return h.kind === 'meal' || h.kind === 'exercise'; }).slice().reverse().slice(0, 5);
    view.innerHTML = head('健康', '食事・運動・睡眠・体重を記録します。数字は記録として正確に残し、AIは傾向を見て、続けやすい工夫を提案します。') +
      '<form id="f-health" class="card form"><h2 class="form-title">今日の記録をつける</h2>' +
        '<label>種類<select name="kind"><option value="steps">歩数（歩）</option><option value="weight">体重（kg）</option><option value="sleep">睡眠（時間）</option><option value="meal">食事（メモ）</option><option value="exercise">運動（メモ）</option></select></label>' +
        '<label>内容<input type="text" name="value" required placeholder="例：6500（歩数のとき）"></label>' +
        '<button class="btn block" type="submit">記録する</button></form>' +
      '<section class="ai-hint"><div class="avatar" aria-hidden="true">AI</div><p>きのうまでの6日間の歩数は、1日平均 <b>' + avgSteps().toLocaleString('ja-JP') + '歩</b> です。' + lowDay(st) + '予定の少ない日に、歩く時間を入れてみましょうか？</p></section>' +
      '<h2 class="section-title">歩数（この7日・今日は途中）</h2><div class="card chart-card" data-testid="steps-chart">' + bars(st[0], st[1], '歩') + '</div>' +
      '<h2 class="section-title">体重（kg）</h2><div class="card chart-card">' + (wv.length > 1 ? line(wv, wl, 'kg') : '<p class="empty">記録が2日分そろうとグラフになります</p>') + '</div>' +
      '<h2 class="section-title">睡眠（時間）</h2><div class="card chart-card">' + bars(sl[0], sl[1], '時間') + '</div>' +
      '<h2 class="section-title">食事・運動のメモ</h2><div class="card" style="padding-top:4px;padding-bottom:4px">' +
        (notes.length ? notes.map(function (h) { return '<div class="mem"><p class="text">' + esc(h.value) + '</p><p class="src">' + esc(HEALTH_KINDS[h.kind][0] + '・' + label(fromKey(h.date))) + '</p></div>'; }).join('') : '<p class="empty">まだありません</p>') +
      '</div>' +
      '<p class="promise">AIの提案は、医療の判断のかわりではありません。気になる体の変化は、医師に相談してください。</p>';
  }

  // ---- 大学 ----
  function renderUniv() {
    if (params[0]) { renderFaculty(params[0]); return; }
    var nu = nextUniv();
    view.innerHTML = head(NAME + 'さんの大学', '世界中の知識が、自分専用の大学になります。先生は世界中の専門家。AIが教材を選び、講義ノートをつくり、進み具合と理解を見守ります。') +
      '<div class="card next' + (nu ? ' ok' : '') + '">' +
        (nu ? '<p><b>次の授業</b>　' + esc(label(fromKey(nu.date)) + ' ' + nu.time) + '<br>' + t(nu.title) + '<br><span class="small">予定に入っています</span></p>'
            : '<p><b>次の授業</b>　予防栄養学の基礎 <span class="nw">第4回</span>は、まだ予定に入っていません。</p><button class="btn" style="margin-top:10px" data-act="consult">AIに時間を相談する</button>') +
      '</div>' +
      '<a class="card next-lecture" href="#/lecture/f1/c1/l3"><span class="small">次に受ける講義（今日 14:00）</span><br><b>予防栄養学の基礎 <span class="nw">第3回</span>　食物繊維と腸</b><br><span class="small">講義ノート・小テストを開く</span></a>' +
      '<h2 class="section-title">学部</h2><div class="stack">' +
        state.univ.map(function (f) {
          var n = 0, d = 0; f.courses.forEach(function (c) { c.lectures.forEach(function (l) { n++; if (l.done) d++; }); });
          return '<a class="card faculty" href="#/univ/' + f.id + '"><h3>' + esc(f.name) + (f.mine ? ' <span class="badge-ai">AIと作成</span>' : '') + '</h3><p class="small">' + esc(f.desc) + '</p><p class="small">科目 ' + f.courses.length + '・講義 ' + n + '（受講ずみ ' + d + '）</p></a>';
        }).join('') +
      '</div>' +
      '<div class="card" style="margin-top:16px"><p><b>学部をつくる</b></p><p class="small" style="margin-top:4px">学びたいことを伝えると、AIが12週の学習計画をつくります。</p><button class="btn" style="margin-top:12px" data-act="say-go" data-text="地元の歴史を学ぶ学部をつくって">例：地元の歴史を学ぶ学部をつくって</button></div>' +
      '<h2 class="section-title">大学の6つのしくみ</h2><ol class="six-fn">' +
        '<li><b>カリキュラム生成</b>　目的から12週の学習計画</li><li><b>教材収集</b>　YouTube・Podcast・公開講座から</li><li><b>AI講義ノート</b>　要点・ことばの説明・原典</li><li><b>AI教授</b>　わからないことを質問できる</li><li><b>演習・評価</b>　小テストと復習</li><li><b>知識の蓄積</b>　学んだことを記憶に残す</li>' +
      '</ol>' +
      '<p class="promise">動画や音声は、字幕や公式の情報など正規の方法で使い、著作権と各サービスの決まりを守ります。</p>';
  }
  function renderFaculty(fid) {
    var f = find(state.univ, fid);
    if (!f) { view.innerHTML = head('学部が見つかりません') + '<a class="btn" href="#/univ">大学へ</a>'; return; }
    view.innerHTML = head(f.name, esc(f.desc)) +
      f.courses.map(function (c) {
        var d = c.lectures.filter(function (l) { return l.done; }).length;
        return '<section class="card course" data-testid="course"><h2>' + esc(c.name) + '</h2><p class="small">' + esc(c.plan) + '・受講ずみ ' + d + ' / ' + c.lectures.length + '</p>' +
          '<ul class="lectures">' + c.lectures.map(function (l) {
            return '<li><a class="lecture-link" href="#/lecture/' + f.id + '/' + c.id + '/' + l.id + '">' + (l.done ? '<span class="mark done-mark">✓</span>' : '<span class="mark">・</span>') + '<span>' + t(l.title) + '<br><span class="small">教材：' + esc(l.src) + '</span></span></a></li>';
          }).join('') + '</ul>' +
          '<form class="form inline add-material" data-fid="' + f.id + '" data-cid="' + c.id + '"><label class="grow">教材を登録（題名やURL）<input type="text" name="title" required placeholder="例：講義動画のURL"></label><button class="btn secondary" type="submit">登録</button></form>' +
        '</section>';
      }).join('') +
      '<div class="row" style="margin-top:18px"><a class="btn secondary" href="#/univ">大学の一覧へ</a></div>';
  }
  function curLecture() {
    var f = find(state.univ, params[0]), c = f && find(f.courses, params[1]), l = c && find(c.lectures, params[2]);
    return l ? { f: f, c: c, l: l } : null;
  }
  function renderLecture() {
    var cur = curLecture();
    if (!cur) { view.innerHTML = head('講義が見つかりません') + '<a class="btn" href="#/univ">大学へ</a>'; return; }
    var f = cur.f, c = cur.c, l = cur.l, q = l.quiz;
    view.innerHTML = '<p class="crumb">' + esc(f.name) + '　›　' + esc(c.name) + '</p>' + '<h1 class="page-title">' + t(l.title) + '</h1>' +
      '<p class="small">教材：' + esc(l.src) + '</p>' +
      '<section class="card" style="margin-top:14px"><h2 class="form-title">AI講義ノート</h2><ul class="points">' + l.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
        (l.terms.length ? '<h3 class="mini">ことばの説明</h3><dl class="terms">' + l.terms.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>' : '') +
        '<p class="small" style="margin-top:10px">原典：' + esc(l.src) + '（字幕や公式の情報から、日本語でまとめます）</p></section>' +
      (q ? '<section class="card" style="margin-top:14px" data-testid="quiz"><h2 class="form-title">小テスト</h2><p>' + esc(q.q) + '</p><div class="actions">' +
        q.choices.map(function (ch, i) { return '<button class="btn secondary block" data-act="quiz" data-i="' + i + '">' + esc(ch) + '</button>'; }).join('') +
        '</div><p class="quiz-result" id="quiz-result" aria-live="polite"></p></section>' : '') +
      '<section class="card" style="margin-top:14px"><h2 class="form-title">AI教授に質問する</h2><p class="small">わからないことを、講義の内容にそって答えます。</p><button class="btn secondary block" style="margin-top:10px" data-act="ask-prof">' + esc((l.terms[0] ? l.terms[0][0] : 'この講義の要点') + 'を、もう少しやさしく教えて') + '</button><p class="prof" id="prof" aria-live="polite"></p></section>' +
      '<div class="actions" style="margin-top:18px">' + (l.done ? '<p class="done-note">✓ 受講ずみ</p>' : '<button class="btn block" data-act="lecture-done">受講した</button>') +
        '<a class="btn quiet block" href="#/univ/' + f.id + '">学部へもどる</a></div>';
  }

  // ---- 日記 ----
  function renderDiary() {
    var q = state.diaryQuery || '';
    var list = state.diary.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).filter(function (d) { return !q || d.text.indexOf(q) >= 0; });
    view.innerHTML = head('日記', '話すだけで、毎日の出来事を残せます。あとから言葉で探せます。') +
      '<form id="f-diary" class="card form"><h2 class="form-title">' + esc(label(TODAY)) + 'の日記</h2>' +
        '<label class="sr" for="diary-text">日記の本文</label><textarea id="diary-text" name="text" rows="4" required placeholder="今日あったこと、感じたことを書きます"></textarea>' +
        '<div class="row"><button type="button" class="btn secondary" data-act="voice" data-target="diary-text">' + ICON.mic + '<span>声で入力</span></button><button class="btn" type="submit">保存する</button></div></form>' +
      '<form id="f-diary-search" class="form inline"><label class="grow">日記を探す<input type="search" name="q" value="' + esc(q) + '" placeholder="例：散歩"></label><button class="btn secondary" type="submit">探す</button></form>' +
      (q ? '<p class="small hits" data-testid="diary-hits">「' + esc(q) + '」は ' + list.length + '件　<button class="btn quiet" data-act="diary-clear">すべて表示</button></p>' : '') +
      '<div class="stack" style="margin-top:12px" id="diary-list">' + list.map(function (d) {
        return '<article class="card diary-item"><p class="small">' + esc(label(fromKey(d.date))) + '</p><p>' + esc(d.text) + '</p></article>';
      }).join('') + (list.length ? '' : '<p class="empty">見つかりませんでした</p>') + '</div>' +
      '<div class="card" style="margin-top:16px"><p>日記から、気づいたことをAIにまとめてもらえます。</p><button class="btn secondary" style="margin-top:10px" data-act="say-go" data-text="今週の日記から、気づいたことは？">今週の日記をふりかえる</button></div>';
  }

  // ---- 写真 ----
  var ART = {
    walk: '<svg viewBox="0 0 160 120" role="img" aria-label="散歩道のイラスト"><rect width="160" height="120" fill="#dfe8e2"/><path d="M0 90 C40 70 80 100 160 80 V120 H0z" fill="#9cb8a4"/><path d="M70 120 L85 60 L95 60 L120 120z" fill="#e9dcc3"/><circle cx="125" cy="28" r="12" fill="#f2d48a"/></svg>',
    book: '<svg viewBox="0 0 160 120" role="img" aria-label="本のイラスト"><rect width="160" height="120" fill="#efe6d6"/><rect x="30" y="40" width="46" height="56" rx="3" fill="#223a5e"/><rect x="84" y="40" width="46" height="56" rx="3" fill="#8a7048"/><path d="M80 40 V96" stroke="#fff" stroke-width="3"/></svg>',
    garden: '<svg viewBox="0 0 160 120" role="img" aria-label="ミニトマトのイラスト"><rect width="160" height="120" fill="#e5efe0"/><path d="M80 110 V50" stroke="#5d8a5a" stroke-width="5"/><circle cx="62" cy="62" r="11" fill="#d9534f"/><circle cx="96" cy="72" r="11" fill="#d9534f"/><circle cx="80" cy="44" r="11" fill="#e0794f"/></svg>'
  };
  function renderPhoto() {
    view.innerHTML = head('写真', '写真とひとことメモを残します。製品版では、AIが日付・場所・人で整理し、思い出をふりかえれるようにします。') +
      '<form id="f-photo" class="card form"><h2 class="form-title">写真を追加</h2>' +
        '<label class="btn secondary block file-btn">写真を選ぶ<input id="photo-file" type="file" accept="image/*"></label>' +
        '<p class="small" id="photo-chosen">まだ選んでいません</p>' +
        '<label>メモ<input type="text" name="memo" placeholder="例：孫と動物園"></label>' +
        '<button class="btn block" type="submit">保存する</button></form>' +
      '<div class="photos" id="photo-grid">' + state.photos.slice().reverse().map(function (p) {
        return '<figure class="photo">' + (p.src ? '<img src="' + p.src + '" alt="' + esc(p.memo || '写真') + '">' : (ART[p.art] || ART.walk)) + '<figcaption>' + esc(p.memo || '（メモなし）') + '<br><span class="small">' + esc(label(fromKey(p.date))) + '</span></figcaption></figure>';
      }).join('') + '</div>';
  }

  // ---- 関心情報 ----
  function renderFeeds() {
    view.innerHTML = head('関心情報', 'コミュニティ・推し活・YouTube・Podcast など、気になる情報源を登録します。製品版では、AIが新着を毎朝集めて、やさしくまとめます。') +
      '<form id="f-source" class="card form"><h2 class="form-title">情報源を登録</h2>' +
        '<label>種類<select name="type">' + Object.keys(SOURCE_TYPES).map(function (k) { return '<option value="' + k + '">' + SOURCE_TYPES[k] + '</option>'; }).join('') + '</select></label>' +
        '<label>名前<input type="text" name="name" required placeholder="例：町内のグラウンドゴルフ会"></label>' +
        '<button class="btn block" type="submit">登録する</button></form>' +
      '<h2 class="section-title">新着（例）</h2><div class="stack">' + state.sources.map(function (s) {
        return '<article class="card source"><p class="src-type">' + esc(SOURCE_TYPES[s.type] || s.type) + '</p><h3>' + esc(s.name) + '</h3>' +
          '<p>' + esc(FEED_EXAMPLES[s.id] || 'AIが新着を集めると、ここに表示されます。') + '</p>' + (s.note ? '<p class="small">' + esc(s.note) + '</p>' : '') +
          '<div class="row"><button class="btn quiet" data-act="del-source" data-id="' + s.id + '">登録を外す</button></div></article>';
      }).join('') + '</div>';
  }

  // ---- 投資 ----
  function renderInvest() {
    view.innerHTML = head('投資', '気になる投資のテーマを並べておきます。AIはニュースやことばの説明を集めますが、投資の判断はかわりにしません。') +
      '<form id="f-invest" class="form inline"><label class="grow">テーマを追加<input type="text" name="theme" required placeholder="例：高配当株"></label><button class="btn" type="submit">追加</button></form>' +
      '<div class="stack" style="margin-top:14px">' + (state.invest.length ? '' : '<p class="empty">まだありません。気になるテーマを追加してください</p>') + state.invest.map(function (x) {
        return '<article class="card"><h3>' + esc(x.theme) + '</h3>' + (x.note ? '<p class="small">' + esc(x.note) + '</p>' : '') +
          '<div class="row" style="margin-top:10px"><button class="btn secondary" data-act="say-go" data-text="' + esc(x.theme) + 'ってなに？">AIに聞く</button><button class="btn quiet" data-act="del-invest" data-id="' + x.id + '">外す</button></div></article>';
      }).join('') + '</div>' +
      '<p class="promise">保有している資産は、本人が確かめた取引の記録だけを正本にします。AIが推測で書きかえることはありません。</p>';
  }

  // ---- 人生の記録 ----
  function renderLife() {
    view.innerHTML = head('人生の記録', '大切にしている価値観、これまでの経験、これからの目標を残します。AIは、提案のときにここを参考にします。') +
      '<form id="f-life" class="card form"><label>種類<select name="kind"><option>価値観</option><option>経験</option><option>目標</option></select></label>' +
        '<label>内容<input type="text" name="text" required placeholder="例：地域の子どもに昔の遊びを教えたい"></label><button class="btn block" type="submit">残す</button></form>' +
      ['価値観', '経験', '目標'].map(function (k) {
        var xs = state.life.filter(function (x) { return x.kind === k; });
        return '<h2 class="section-title">' + k + '</h2><div class="card" style="padding-top:4px;padding-bottom:4px">' + (xs.length ? xs.map(function (x) { return '<div class="mem"><p class="text">' + esc(x.text) + '</p></div>'; }).join('') : '<p class="empty">まだありません</p>') + '</div>';
      }).join('');
  }

  // ---- 覚えていること ----
  function renderMemory() {
    var editing = state.editing;
    view.innerHTML = head('覚えていること', 'AIが' + NAME + 'さんについて覚えていることです。提案はここをもとにつくります。直すことも、消すこともできます。') +
      state.candidates.map(function (c) {
        return '<section class="card candidate" data-testid="candidate"><h2>新しく覚えてよいですか？</h2>' +
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

  // ---- データ管理 ----
  function renderData() {
    var n = state.events.length + state.tasks.length + state.health.length + state.diary.length + state.photos.length + state.sources.length + state.invest.length + state.life.length + state.memories.length;
    view.innerHTML = head('データ管理', '記録はこの端末のブラウザの中に保存しています。ファイルに書き出して、手元に残せます。') +
      '<div class="card"><p>いまの記録　<b>' + n + '件</b></p><p class="small">予定・やること・健康・日記・写真・情報源・投資・人生の記録・覚えていること</p></div>' +
      '<div class="actions" style="margin-top:16px">' +
        '<button class="btn block" data-act="export">記録をファイルに書き出す（JSON）</button>' +
        '<label class="btn secondary block file-btn">ファイルから読み込む<input id="import-file" type="file" accept="application/json,.json"></label>' +
        '<button class="btn quiet block" data-act="reset">試作版を最初の状態にもどす</button>' +
      '</div>' +
      '<p class="promise">製品版では、MulmoClaude の Collections（記録）と Personal Wiki（記憶）に保存し、スマホからは自宅のパソコンのAIにつないで使う計画です。</p>';
  }

  // ---------- 操作 ----------
  function goChat(text) {
    if (location.hash !== '#/chat') { location.hash = '#/chat'; setTimeout(function () { send(text); }, 50); }
    else send(text);
  }
  function startVoice(targetId) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('このブラウザは声の入力に対応していません。製品版では、話しかけるだけで使えます'); return; }
    try {
      var r = new SR(); r.lang = 'ja-JP'; r.interimResults = false;
      r.onresult = function (ev) { var el = document.getElementById(targetId); if (el) el.value = (el.value ? el.value + ' ' : '') + ev.results[0][0].transcript; };
      r.onerror = function () { toast('声を聞き取れませんでした'); };
      r.start(); toast('お話しください');
    } catch (e) { toast('声の入力を始められませんでした'); }
  }
  function download(name, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]'); if (!el) return;
    var act = el.getAttribute('data-act'), id = el.getAttribute('data-id'), cur;
    switch (act) {
      case 'close-guide': state.guideClosed = true; save(); renderToday(); break;
      case 'consult': goChat('来週の予定に、運動と大学の勉強を組み込んで'); break;
      case 'say': send(el.getAttribute('data-text')); break;
      case 'say-go': goChat(el.getAttribute('data-text')); break;
      case 'approve': approve(id); break;
      case 'decline': decline(id); break;
      case 'voice': startVoice(el.getAttribute('data-target')); break;
      case 'toggle-task': var x = find(state.tasks, id); if (x) { x.done = !x.done; save(); renderTasks(); } break;
      case 'del-task': state.tasks = state.tasks.filter(function (y) { return y.id !== id; }); save(); renderTasks(); toast('消しました'); break;
      case 'del-event': state.events = state.events.filter(function (y) { return y.id !== id; }); save(); renderSchedule(); toast('予定を消しました'); break;
      case 'del-source': state.sources = state.sources.filter(function (y) { return y.id !== id; }); save(); renderFeeds(); break;
      case 'del-invest': state.invest = state.invest.filter(function (y) { return y.id !== id; }); save(); renderInvest(); break;
      case 'toggle-mod': state.active[id] = !state.active[id]; save(); renderAll(); toast(state.active[id] ? '「' + mod(id).name + '」を足しました' : '「' + mod(id).name + '」を外しました（記録は消えません）'); break;
      case 'diary-clear': state.diaryQuery = ''; renderDiary(); break;
      case 'quiz':
        cur = curLecture(); if (!cur || !cur.l.quiz) break;
        document.getElementById('quiz-result').textContent = +el.getAttribute('data-i') === cur.l.quiz.answer ? '正解です。よく理解できています。' : 'おしい。講義ノートをもう一度見てみましょう。';
        break;
      case 'ask-prof':
        cur = curLecture(); if (!cur) break;
        document.getElementById('prof').textContent = cur.l.terms[0] ? '「' + cur.l.terms[0][0] + '」は、' + cur.l.terms[0][1] + 'のことです。毎日の暮らしの中で、どんな場面に関わりそうか、一緒に考えてみましょう。' : 'この講義の要点は「' + cur.l.points[0] + '」です。ご自分の暮らしに当てはめると、どんな場面がありそうですか？';
        break;
      case 'lecture-done':
        cur = curLecture(); if (!cur || cur.l.done) break;
        cur.l.done = true;
        state.candidates.push({ id: nid('c'), text: '「' + cur.l.title.replace(/^第\d+回\s*/, '') + '」で学んだ：' + cur.l.points[0], src: cur.f.name + 'の講義から' });
        save(); renderLecture(); toast('受講しました。学んだことを覚えるかどうか、「覚えていること」で確認します'); break;
      case 'mem-accept':
        var c = find(state.candidates, id);
        if (c) state.memories.unshift({ id: nid('m'), text: c.text, src: c.src + '・承認ずみ' });
        state.candidates = state.candidates.filter(function (y) { return y.id !== id; });
        save(); renderMemory(); toast('覚えました'); break;
      case 'mem-reject':
        state.candidates = state.candidates.filter(function (y) { return y.id !== id; });
        save(); renderMemory(); toast('覚えずに終えました'); break;
      case 'mem-edit': state.editing = id; renderMemory(); var inp = document.getElementById('mem-edit'); if (inp) inp.focus(); break;
      case 'mem-cancel': state.editing = null; renderMemory(); break;
      case 'mem-save':
        var v = document.getElementById('mem-edit').value.trim(), m = find(state.memories, id);
        if (m && v) { m.text = v; m.src = '本人が直しました'; }
        state.editing = null; save(); renderMemory(); toast('直しました'); break;
      case 'mem-del':
        state.memories = state.memories.filter(function (y) { return y.id !== id; });
        save(); renderMemory(); toast('忘れました。今後の提案には使いません'); break;
      case 'export':
        var out = JSON.parse(JSON.stringify(state)); delete out.chat; delete out.typing; delete out.editing;
        out.exportedAt = new Date().toISOString();
        download('my-second-place-ai-' + key(TODAY) + '.json', JSON.stringify(out, null, 2)); toast('ファイルに書き出しました'); break;
      case 'reset':
        try { localStorage.removeItem(STORE_KEY); } catch (e) { /* noop */ }
        state = seed(); fresh(); location.hash = '#/today'; route(); toast('最初の状態にもどしました'); break;
    }
  });

  var pendingPhoto = null;
  document.addEventListener('submit', function (ev) {
    var f = ev.target; ev.preventDefault();
    var fd = new FormData(f), g = function (k) { return String(fd.get(k) || '').trim(); };
    if (f.id === 'composer') { var inp = document.getElementById('say'); var text = inp.value; inp.value = ''; send(text); return; }
    if (f.id === 'f-event') { if (!g('title')) return; state.events.push({ id: nid('e'), date: g('date'), time: g('time'), title: g('title') }); save(); renderSchedule(); toast('予定を追加しました'); return; }
    if (f.id === 'f-task') { if (!g('title')) return; state.tasks.push({ id: nid('t'), date: key(TODAY), title: g('title'), done: false }); save(); renderTasks(); toast('今日のやることに追加しました'); return; }
    if (f.id === 'f-health') {
      var kind = g('kind'), val = g('value');
      if (!val) return;
      if (kind === 'steps' || kind === 'weight' || kind === 'sleep') {
        var num = parseFloat(val.replace(/[０-９．]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); }).replace(/[,，]/g, ''));
        if (isNaN(num)) { toast('数字で入れてください'); return; }
        state.health = state.health.filter(function (h) { return !(h.kind === kind && h.date === key(TODAY)); });
        val = num;
      }
      state.health.push({ id: nid('h'), date: key(TODAY), kind: kind, value: val });
      save(); renderHealth(); toast(HEALTH_KINDS[kind][0] + 'を記録しました'); return;
    }
    if (f.id === 'f-diary') { if (!g('text')) return; state.diary.push({ id: nid('d'), date: key(TODAY), text: g('text') }); save(); renderDiary(); toast('日記を保存しました'); return; }
    if (f.id === 'f-diary-search') { state.diaryQuery = g('q'); renderDiary(); return; }
    if (f.id === 'f-source') { if (!g('name')) return; state.sources.push({ id: nid('s'), type: g('type'), name: g('name'), note: '' }); save(); renderFeeds(); toast('情報源を登録しました'); return; }
    if (f.id === 'f-invest') { if (!g('theme')) return; state.invest.push({ id: nid('i'), theme: g('theme'), note: '' }); save(); renderInvest(); toast('テーマを追加しました'); return; }
    if (f.id === 'f-life') { if (!g('text')) return; state.life.push({ id: nid('y'), kind: g('kind'), text: g('text') }); save(); renderLife(); toast('残しました'); return; }
    if (f.id === 'f-photo') {
      if (!pendingPhoto) { toast('先に写真を選んでください'); return; }
      state.photos.push({ id: nid('p'), date: key(TODAY), memo: g('memo'), src: pendingPhoto }); pendingPhoto = null;
      save(); renderPhoto(); toast('写真を保存しました'); return;
    }
    if (f.classList.contains('add-material')) {
      var ff = find(state.univ, f.getAttribute('data-fid')), cc = ff && find(ff.courses, f.getAttribute('data-cid'));
      if (!cc || !g('title')) return;
      cc.lectures.push(lec(nid('l'), '第' + (cc.lectures.length + 1) + '回　登録した教材', g('title'), ['AIが字幕や公式の情報から、要点をまとめます'], [], null));
      save(); renderFaculty(ff.id); toast('教材を登録しました'); return;
    }
  });

  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.id === 'photo-file' && el.files && el.files[0]) {
      var img = new Image(), url = URL.createObjectURL(el.files[0]);
      img.onload = function () {
        var s = Math.min(1, 640 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        pendingPhoto = cv.toDataURL('image/jpeg', 0.8); URL.revokeObjectURL(url);
        document.getElementById('photo-chosen').textContent = '選びました：' + el.files[0].name;
      };
      img.onerror = function () { toast('この写真は読み込めませんでした'); };
      img.src = url;
    }
    if (el.id === 'import-file' && el.files && el.files[0]) {
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var s = JSON.parse(rd.result);
          if (!s || s.v !== 2 || !Array.isArray(s.events) || !Array.isArray(s.memories)) throw new Error('bad');
          s.today = key(TODAY); s.chat = s.chat || [];
          state = s; fresh(); save(); renderData(); toast('ファイルから読み込みました');
        } catch (e) { toast('この試作版のファイルではないようです'); }
      };
      rd.readAsText(el.files[0]);
    }
  });

  window.addEventListener('hashchange', route);
  route();
})();
