import { db, getSetting, setSetting } from './db.js';
import {
  EMOTIONS, INTENSITY, GOAL_RESULTS, ALL_QUESTIONS, DEFAULT_SETTINGS, WEEKDAYS, SLEEP, CONTEXTS,
  dayKey, questionsForDay, emotionById, computeStats, computeContextStats, computeSleepStats,
  starBalance, nextReward, escapeHtml as esc,
  SAY, TURTLE_STEPS, SQUEEZE_STEPS, intensityQuestion, planSentence, textHash, TTS_SPEAKER,
} from './logic.js';

const app = document.getElementById('app');
const MAX_RECORD_MS = 90_000;

// ---------- helpers ----------
// `say`: what the screen reads aloud (strings = spoken text, {audioId} = a parent's recording).
function render(html, bind, say) {
  stopAudio();
  app.innerHTML = html + (say ? '<button class="say" data-say aria-label="Kuula uuesti">🔊</button>' : '');
  window.scrollTo(0, 0);
  bind?.(app);
  if (say) { on('[data-say]', () => speak(say, { force: true })); speak(say); }
}
const $ = (sel, root = app) => root.querySelector(sel);
const $$ = (sel, root = app) => [...root.querySelectorAll(sel)];
const on = (sel, fn, root = app) => $$(sel, root).forEach((el) => el.addEventListener('click', fn));

async function settings() {
  return {
    goals: await getSetting('goals', DEFAULT_SETTINGS.goals),
    plans: await getSetting('plans', DEFAULT_SETTINGS.plans),
    rewards: await getSetting('rewards', DEFAULT_SETTINGS.rewards),
  };
}
async function stars() { return starBalance(await db.all('stars')); }
async function addStar(delta, reason) { await db.put('stars', { delta, reason, ts: Date.now() }); }
function newId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

// ---------- audio ----------
// One shared <audio> element, unlocked by the first tap: iOS blocks sound that doesn't start from a tap.
const player = new Audio();
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
document.addEventListener('pointerdown', () => { player.src = SILENT; player.play().catch(() => {}); }, { once: true });
let playToken = 0;
let soundOn = true;
let bundled = new Set();
const ready = Promise.all([
  fetch('./audio/index.json').then((r) => r.json()).then((l) => { bundled = new Set(l); }).catch(() => {}),
  getSetting('sound', true).then((v) => { soundOn = v; }),
]);

function stopAudio() { playToken += 1; player.pause(); }

function playUrl(url, token) {
  return new Promise((resolve) => {
    if (token !== playToken) return resolve();
    player.onended = () => resolve();
    player.onerror = () => resolve();
    player.src = url;
    player.play().catch(() => resolve());
  });
}

async function urlFor(item) {
  if (item.audioId) { const b = await db.get('audio', item.audioId); return b ? URL.createObjectURL(b) : null; }
  const h = textHash(item);
  const custom = await db.get('audio', `tts:${h}`);
  if (custom) return URL.createObjectURL(custom);
  return bundled.has(h) ? `./audio/${h}.m4a` : null;
}

// Plays items one after another; stops as soon as the screen changes.
async function speak(items, { force = false } = {}) {
  await ready;
  if (!soundOn && !force) return;
  stopAudio();
  const token = playToken;
  for (const item of items.filter(Boolean)) {
    const url = await urlFor(item);
    if (token !== playToken) return;
    if (url) await playUrl(url, token);
  }
}
const playAudio = (audioId) => speak([{ audioId }], { force: true });

// Makes a voice for a parent-written sentence (needs internet once), stored on the device.
async function ensureVoice(text) {
  const h = textHash(text);
  if (bundled.has(h) || (await db.get('audio', `tts:${h}`))) return true;
  try {
    const res = await fetch('https://api.tartunlp.ai/text-to-speech/v2', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speaker: TTS_SPEAKER, speed: 0.95 }),
    });
    if (!res.ok) return false;
    await db.put('audio', await res.blob(), `tts:${h}`);
    return true;
  } catch { return false; }
}
function pickMime() {
  if (!window.MediaRecorder) return null;
  return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
}

// A record/stop/listen widget. onSaved(audioId) is called after each finished recording.
function recorder(container, { audioId = null, onSaved, big = true } = {}) {
  let rec = null; let stream = null; let timer = null; let id = audioId;
  const draw = (state) => {
    const cls = big ? 'btn big' : 'btn';
    container.innerHTML = {
      idle: `<button class="${cls} rec" data-r="start">🎙️ ${id ? 'Räägi uuesti' : 'Räägi'}</button>
             ${id ? `<button class="${cls} ghost" data-r="play">▶️ Kuula</button>` : ''}`,
      recording: `<button class="${cls} rec on" data-r="stop">⏹️ Valmis</button><p class="hint pulse">Kuulan…</p>`,
      error: `<p class="hint">Mikrofon ei tööta. Luba mikrofon telefoni seadetes.</p>`,
    }[state];
    on('[data-r=start]', start, container);
    on('[data-r=stop]', stop, container);
    on('[data-r=play]', () => playAudio(id), container);
  };
  async function start() {
    stopAudio();
    container.innerHTML = '<p class="hint pulse">Oota…</p>';
    const mime = pickMime();
    if (mime === null) return draw('error');
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return draw('error'); }
    const chunks = [];
    rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      clearTimeout(timer);
      const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
      id ??= newId();
      await db.put('audio', blob, id);
      draw('idle');
      onSaved?.(id);
    };
    rec.start();
    timer = setTimeout(stop, MAX_RECORD_MS);
    draw('recording');
  }
  function stop() { if (rec?.state === 'recording') rec.stop(); }
  draw('idle');
}

function celebrate() {
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.innerHTML = Array.from({ length: 24 }, (_, i) =>
    `<span style="left:${(i * 37) % 100}%;animation-delay:${(i % 6) * 0.12}s">${['⭐', '🌟', '✨'][i % 3]}</span>`).join('');
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 2500);
}

// ---------- child: home ----------
async function home() {
  const today = dayKey();
  const [bal, s, morning, evening] = await Promise.all([
    stars(), settings(), db.get('entries', `${today}-morning`), db.get('entries', `${today}-evening`),
  ]);
  const { next, remaining, reachable } = nextReward(bal, s.rewards);
  const hour = new Date().getHours();
  await ready;
  render(`
    <header class="top"><h1>Minu päev</h1><button class="sound" data-sound>${soundOn ? '🔊' : '🔇'}</button><div class="stars">⭐ ${bal}</div></header>
    ${next ? `<p class="reward">Veel <b>${remaining}</b> ⭐ ja saad: <b>${esc(next.text)}</b></p>` : ''}
    ${reachable.length ? `<p class="reward ok">Sul on piisavalt tähti: <b>${esc(reachable.at(-1).text)}</b>. Näita emmele või issile!</p>` : ''}
    <div class="menu">
      <button class="tile morning ${hour < 12 ? 'suggest' : ''}" data-go="morning">🌅<span>Hommik</span>${morning ? '<i>✓</i>' : ''}</button>
      <button class="tile evening ${hour >= 17 ? 'suggest' : ''}" data-go="evening">🌙<span>Õhtu</span>${evening ? '<i>✓</i>' : ''}</button>
      <button class="tile calm" data-go="calm">🐢<span>Rahune maha</span></button>
    </div>
    <button class="parent-link" data-go="parent">Vanemale</button>
  `, () => {
    on('[data-go=morning]', morningFlow);
    on('[data-go=evening]', eveningFlow);
    on('[data-go=calm]', calmMenu);
    on('[data-go=parent]', parentGate);
    on('[data-sound]', async (ev) => {
      soundOn = !soundOn; await setSetting('sound', soundOn);
      ev.currentTarget.textContent = soundOn ? '🔊' : '🔇';
    });
  });
}

function backBtn(fn = home) {
  setTimeout(() => on('[data-back]', fn));
  return `<button class="back" data-back>←</button>`;
}

function emotionPicker(title, onPick) {
  render(`
    ${backBtn()}
    <h2>${title}</h2>
    <div class="emotions">
      ${EMOTIONS.map((e) => `<button class="emo" style="--c:${e.color}" data-e="${e.id}"><b>${e.emoji}</b>${e.label}</button>`).join('')}
    </div>
  `, () => on('[data-e]', (ev) => onPick(ev.currentTarget.dataset.e)), [title]);
}

// ---------- child: morning (implementation intentions) ----------
async function morningFlow() {
  const today = dayKey();
  const s = await settings();
  const entry = { id: `${today}-morning`, type: 'morning', date: today, createdAt: Date.now() };
  const plans = s.plans.filter((p) => p.if && p.then);

  emotionPicker(SAY.morningHello, (emotion) => {
    entry.emotion = emotion;
    askSleep();
  });

  function askSleep() {
    render(`
      ${backBtn()}
      <h2>${SAY.sleep}</h2>
      <div class="list">${SLEEP.map((s) => `<button class="btn choice" data-s="${s.id}">${s.emoji} ${s.label}</button>`).join('')}</div>
    `, () => on('[data-s]', (ev) => { entry.sleep = ev.currentTarget.dataset.s; showPlan(0); }), [SAY.sleep]);
  }

  async function showPlan(i) {
    if (i >= plans.length) return chooseGoal();
    const p = plans[i];
    const voice = await getSetting(`voice:plan:${i}`, null);
    render(`
      ${backBtn()}
      <p class="step">Minu plaan ${i + 1}/${plans.length}</p>
      <div class="plan">
        <p><span class="kw">KUI</span> ${esc(p.if)},</p>
        <p><span class="kw">SIIS</span> ${esc(p.then)}.</p>
      </div>
      <p class="hint">${SAY.planHint}</p>
      <button class="btn big" data-next>Ütlesin! ✓</button>
    `, () => on('[data-next]', () => showPlan(i + 1)), [voice ? { audioId: voice } : planSentence(p), SAY.planHint]);
  }

  function chooseGoal() {
    const goals = s.goals.filter(Boolean);
    if (!goals.length) return finish();
    render(`
      ${backBtn()}
      <h2>${SAY.goalToday}</h2>
      <div class="list">${goals.map((g, i) => `<button class="btn choice" data-g="${i}">🎯 ${esc(g)}</button>`).join('')}</div>
    `, () => on('[data-g]', (ev) => { entry.goal = goals[+ev.currentTarget.dataset.g]; finish(); }), [SAY.goalToday]);
  }

  async function finish() {
    const existed = await db.get('entries', entry.id);
    await db.put('entries', entry);
    if (!existed) await addStar(1, 'Hommik');
    celebrate();
    render(`
      <div class="done">
        <div class="bigemoji">⭐</div>
        <h2>${existed ? 'Uuendatud!' : 'Said tähe!'}</h2>
        ${entry.goal ? `<p>Täna on sinu eesmärk:<br><b>${esc(entry.goal)}</b></p>` : ''}
        <p>Sa saad sellega hakkama. 💪</p>
        <button class="btn big" data-home>Valmis</button>
      </div>
    `, () => on('[data-home]', home), [SAY.morningDone]);
  }
}

// ---------- child: evening (emotion coaching + self-monitoring) ----------
async function eveningFlow() {
  const today = dayKey();
  const morning = await db.get('entries', `${today}-morning`);
  const s = await settings();
  const questions = questionsForDay(today);
  const entry = {
    id: `${today}-evening`, type: 'evening', date: today, createdAt: Date.now(),
    goal: morning?.goal || null, answers: [],
  };

  emotionPicker(SAY.eveningHello, (emotion) => {
    entry.emotion = emotion;
    askIntensity();
  });

  function askIntensity() {
    const e = emotionById(entry.emotion);
    render(`
      ${backBtn()}
      <h2>${e.emoji} ${intensityQuestion(e)}</h2>
      <div class="thermo">
        ${[...INTENSITY].reverse().map((i) => `<button class="lvl l${i.value}" data-i="${i.value}">${i.label}</button>`).join('')}
      </div>
    `, () => on('[data-i]', (ev) => { entry.intensity = +ev.currentTarget.dataset.i; askGoal(); }), [intensityQuestion(e)]);
  }

  function askGoal() {
    const goals = s.goals.filter(Boolean);
    if (!entry.goal) {
      if (!goals.length) return askPlaces();
      return render(`
        ${backBtn()}
        <h2>${SAY.goalWhich}</h2>
        <div class="list">${goals.map((g, i) => `<button class="btn choice" data-g="${i}">🎯 ${esc(g)}</button>`).join('')}
        <button class="btn ghost" data-skip>Ei proovinud täna</button></div>
      `, () => {
        on('[data-g]', (ev) => { entry.goal = goals[+ev.currentTarget.dataset.g]; askGoal(); });
        on('[data-skip]', askPlaces);
      }, [SAY.goalWhich]);
    }
    render(`
      ${backBtn()}
      <h2>Kuidas läks sinu eesmärk?</h2>
      <p class="plan small">🎯 ${esc(entry.goal)}</p>
      <div class="list">${GOAL_RESULTS.map((r) => `<button class="btn choice" data-r="${r.id}">${r.emoji} ${r.label}</button>`).join('')}</div>
      <p class="hint">Ausalt vastata on kõige tublim.</p>
    `, () => on('[data-r]', (ev) => { entry.goalResult = ev.currentTarget.dataset.r; askPlaces(); }), [SAY.goalHow]);
  }

  function placePicker(title, extra, onPick) {
    render(`
      ${backBtn()}
      <h2>${title}</h2>
      <div class="places">
        ${CONTEXTS.map((c) => `<button class="place" data-p="${c.id}"><b>${c.emoji}</b>${c.label}</button>`).join('')}
      </div>
      ${extra ? `<button class="btn ghost" data-p="none">${extra}</button>` : ''}
    `, () => on('[data-p]', (ev) => onPick(ev.currentTarget.dataset.p)), [title]);
  }

  function askPlaces() {
    placePicker(SAY.hardPlace, 'Täna polnud raske 🙂', (hard) => {
      entry.hardPlace = hard;
      placePicker(SAY.goodPlace, null, (good) => { entry.goodPlace = good; askQuestion(0); });
    });
  }

  async function askQuestion(i) {
    if (i >= questions.length) return finish();
    const q = questions[i];
    const voice = await getSetting(`voice:q:${q.id}`, null);
    const answer = { questionId: q.id, text: q.text, audioId: null };
    entry.answers[i] = answer;
    render(`
      ${backBtn()}
      <p class="step">Küsimus ${i + 1}/${questions.length}</p>
      <h2 class="question">${esc(q.text)}</h2>
      <div id="rec" class="recwrap"></div>
      <button class="btn big" data-next>Edasi →</button>
      <button class="btn ghost small" data-skip>Jätan vahele</button>
    `, (root) => {
      recorder($('#rec', root), { onSaved: (id) => { answer.audioId = id; } });
      on('[data-next]', () => askQuestion(i + 1));
      on('[data-skip]', () => { answer.skipped = true; askQuestion(i + 1); });
    }, [voice ? { audioId: voice } : q.text, i === 0 ? SAY.recordHint : null]);
  }

  async function finish() {
    const existed = await db.get('entries', entry.id);
    await db.put('entries', entry);
    if (!existed) await addStar(1, 'Õhtu');
    celebrate();
    const e = emotionById(entry.emotion);
    const hard = e.hard && entry.intensity >= 3;
    render(`
      <div class="done">
        <div class="bigemoji">⭐</div>
        <h2>${existed ? 'Uuendatud!' : 'Said tähe!'}</h2>
        <p>${hard
          ? 'Sul oli täna raske tunne ja sa rääkisid sellest. See on julge!'
          : 'Sa oskad oma tundeid ära tunda. Väga hea!'}</p>
        <p><b>Nüüd mine ja kallista emmet või issit. 🤗</b></p>
        <button class="btn big" data-home>Head ööd 🌙</button>
      </div>
    `, () => on('[data-home]', home), [hard ? SAY.eveningDoneHard : SAY.eveningDoneOk]);
  }
}

// ---------- child: calm corner ----------
function calmMenu() {
  render(`
    ${backBtn()}
    <h2>${SAY.calmMenu}</h2>
    <div class="list">
      <button class="btn choice" data-c="turtle">🐢 Kilpkonn</button>
      <button class="btn choice" data-c="balloon">🎈 Õhupalli hingamine</button>
      <button class="btn choice" data-c="squeeze">✊ Pigista ja lase lahti</button>
    </div>
  `, () => {
    on('[data-c=turtle]', () => steps(TURTLE_STEPS, home));
    on('[data-c=balloon]', () => breathing(5, calmMenu));
    on('[data-c=squeeze]', () => steps(SQUEEZE_STEPS, home));
  }, [SAY.calmMenu]);
}

function steps(list, done) {
  const show = (i) => {
    if (i >= list.length) return done();
    const st = list[i];
    render(`
      ${backBtn(calmMenu)}
      <div class="calmstep">
        <div class="bigemoji">${st.emoji}</div>
        <h2>${st.text}</h2>
        ${st.seconds ? `<div class="countdown" data-cd>${st.seconds}</div>` : ''}
        <button class="btn big" data-next ${st.seconds ? 'disabled' : ''}>${i === list.length - 1 ? 'Valmis ✓' : 'Edasi →'}</button>
      </div>
    `, () => {
      on('[data-next]', () => (st.breathe ? breathing(st.breathe, () => show(i + 1)) : show(i + 1)));
      if (st.seconds) {
        let n = st.seconds;
        const t = setInterval(() => {
          n -= 1;
          const cd = $('[data-cd]');
          if (!cd) return clearInterval(t);
          cd.textContent = n;
          if (n <= 0) { clearInterval(t); cd.textContent = '✓'; $('[data-next]').disabled = false; }
        }, 1000);
      }
    }, [st.text]);
  };
  show(0);
}

function breathing(cycles, done) {
  render(`
    ${backBtn(calmMenu)}
    <div class="breath">
      <div class="balloon" data-b></div>
      <h2 data-t>Valmis?</h2>
      <p class="step" data-n>0/${cycles}</p>
    </div>
  `, () => {
    const b = $('[data-b]'); const t = $('[data-t]'); const n = $('[data-n]');
    let c = 0;
    const inhale = () => {
      if (!b.isConnected) return;
      if (c >= cycles) { t.textContent = `${SAY.breatheDone} 🌟`; speak([SAY.breatheDone]); return setTimeout(() => b.isConnected && done(), 1500); }
      t.textContent = SAY.breatheIn; speak([SAY.breatheIn]);
      b.className = 'balloon grow';
      setTimeout(exhale, 4000);
    };
    const exhale = () => {
      if (!b.isConnected) return;
      t.textContent = SAY.breatheOut; speak([SAY.breatheOut]);
      b.className = 'balloon shrink';
      c += 1; n.textContent = `${c}/${cycles}`;
      setTimeout(inhale, 6000);
    };
    setTimeout(inhale, 800);
  });
}

// ---------- parent ----------
async function parentGate() {
  const pin = await getSetting('pin', null);
  render(`
    ${backBtn()}
    <h2>${pin ? 'Sisesta vanema PIN' : 'Loo vanema PIN (4 numbrit)'}</h2>
    <input class="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off">
    <button class="btn big" data-ok>OK</button>
    <p class="hint" data-msg></p>
  `, () => {
    const input = $('.pin'); input.focus();
    on('[data-ok]', async () => {
      const v = input.value.trim();
      if (!/^\d{4}$/.test(v)) { $('[data-msg]').textContent = 'PIN peab olema 4 numbrit.'; return; }
      if (!pin) { await setSetting('pin', v); return parentHome(); }
      if (v === pin) return parentHome();
      $('[data-msg]').textContent = 'Vale PIN.'; input.value = '';
    });
  });
}

function parentNav(active) {
  const tabs = [['days', 'Päevad'], ['incidents', 'Juhtumid'], ['patterns', 'Mustrid'], ['stars', 'Tähed'], ['guide', 'Juhend'], ['settings', 'Seaded']];
  setTimeout(() => {
    on('[data-tab]', (ev) => PARENT_TABS[ev.currentTarget.dataset.tab]());
    on('[data-exit]', home);
  });
  return `<nav class="pnav">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${k === active ? 'active' : ''}">${l}</button>`).join('')}
    <button data-exit>✕</button></nav>`;
}

const parentHome = () => parentDays();

async function parentDays() {
  const entries = (await db.all('entries')).sort((a, b) => b.date.localeCompare(a.date));
  const byDate = {};
  for (const e of entries) (byDate[e.date] ??= {})[e.type] = e;
  const dates = Object.keys(byDate).slice(0, 30);
  const notes = Object.fromEntries(await Promise.all(dates.map(async (d) => [d, await getSetting(`note:${d}`, '')])));
  render(`
    ${parentNav('days')}
    <h2>Päevad</h2>
    ${dates.length ? '' : '<p class="hint">Veel pole ühtegi sissekannet.</p>'}
    ${dates.map((d) => {
      const m = byDate[d].morning; const e = byDate[d].evening;
      const emo = (x) => (x ? `${emotionById(x.emotion)?.emoji ?? ''} ${emotionById(x.emotion)?.label ?? ''}` : '—');
      const res = GOAL_RESULTS.find((r) => r.id === e?.goalResult);
      return `<div class="card">
        <div class="cardhead"><b>${d}</b> <span>${WEEKDAYS[(new Date(`${d}T12:00`).getDay() + 6) % 7]}</span></div>
        <p>🌅 ${emo(m)} ${m?.sleep ? `· uni: ${SLEEP.find((s) => s.id === m.sleep)?.label}` : ''} ${m?.goal ? `· 🎯 ${esc(m.goal)}` : ''}</p>
        <p>🌙 ${emo(e)} ${e?.intensity ? `(${e.intensity}/5)` : ''} ${res ? `· ${res.emoji} ${res.label}` : ''}</p>
        ${e?.hardPlace || e?.goodPlace ? `<p>Raskem: ${placeLabel(e.hardPlace)} · Parem: ${placeLabel(e.goodPlace)}</p>` : ''}
        ${(e?.answers || []).filter(Boolean).map((a) => `<div class="ans"><span>${esc(a.text)}</span>
          ${a.audioId ? `<button class="btn small ghost" data-play="${a.audioId}">▶️</button>` : '<i>—</i>'}</div>`).join('')}
        <textarea data-note="${d}" placeholder="Vanema märkus (nt mis koolis juhtus)">${esc(notes[d])}</textarea>
      </div>`;
    }).join('')}
  `, () => {
    on('[data-play]', (ev) => playAudio(ev.currentTarget.dataset.play));
    $$('[data-note]').forEach((t) => t.addEventListener('change', () => setSetting(`note:${t.dataset.note}`, t.value)));
  });
}

function placeLabel(id) {
  if (id === 'none') return 'polnud raske';
  const c = CONTEXTS.find((x) => x.id === id);
  return c ? `${c.emoji} ${c.label}` : '—';
}

async function parentIncidents() {
  const list = (await db.all('incidents')).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  render(`
    ${parentNav('incidents')}
    <h2>Juhtumid</h2>
    <p class="hint">Pane kirja konkreetne olukord, kui sellest kuuled. Psühholoog näeb siit mustreid: mis eelneb ja mis järgneb.</p>
    <div class="card">
      <input type="date" data-f="date" value="${dayKey()}">
      <select data-f="place">${CONTEXTS.map((c) => `<option value="${c.id}">${c.emoji} ${c.label}</option>`).join('')}</select>
      <label class="lbl">Mis juhtus vahetult enne?</label>
      <textarea data-f="before" placeholder="nt pidi vaikselt ülesannet tegema, oli juba valmis"></textarea>
      <label class="lbl">Mida ta tegi?</label>
      <textarea data-f="behavior" placeholder="nt hakkas häälitsema, karjus vastu"></textarea>
      <label class="lbl">Mis järgnes?</label>
      <textarea data-f="after" placeholder="nt õpetaja tegi märkuse, klass naeris"></textarea>
      <button class="btn" data-add>Lisa juhtum</button>
    </div>
    ${list.map((x) => `<div class="card">
      <div class="cardhead"><b>${x.date}</b><span>${placeLabel(x.place)}</span></div>
      <p><b>Enne:</b> ${esc(x.before) || '—'}</p>
      <p><b>Tegi:</b> ${esc(x.behavior) || '—'}</p>
      <p><b>Järgnes:</b> ${esc(x.after) || '—'}</p>
      <button class="btn small ghost" data-del="${x.id}">Kustuta</button>
    </div>`).join('')}
  `, () => {
    on('[data-add]', async () => {
      const f = Object.fromEntries($$('[data-f]').map((el) => [el.dataset.f, el.value.trim()]));
      if (!f.behavior && !f.before && !f.after) return;
      await db.put('incidents', { id: newId(), createdAt: Date.now(), ...f });
      parentIncidents();
    });
    on('[data-del]', async (ev) => {
      if (!confirm('Kustutan selle juhtumi?')) return;
      await db.del('incidents', ev.currentTarget.dataset.del); parentIncidents();
    });
  });
}

async function parentPatterns() {
  const today = dayKey();
  const all = await db.all('entries');
  const evenings = all.filter((e) => e.type === 'evening');
  const st = computeStats(evenings, { today, days: 28 });
  const ctx = computeContextStats(all, { today, days: 28 });
  const sleep = computeSleepStats(all, { today, days: 28 });
  const since = dayKey(new Date(Date.now() - 28 * 86400000));
  const incidents = (await db.all('incidents')).filter((x) => x.date > since).sort((a, b) => a.date.localeCompare(b.date));
  const ctxMax = Math.max(1, ...Object.values(ctx.hard), ...Object.values(ctx.good));
  const max = Math.max(1, ...Object.values(st.emotionCounts));
  const noteKeys = (await db.keys('kv')).filter((k) => String(k).startsWith('note:')).sort();
  const notes = [];
  for (const k of noteKeys) {
    const d = k.slice(5); const v = await getSetting(k, '');
    if (v && d > dayKey(new Date(Date.now() - 28 * 86400000))) notes.push([d, v]);
  }
  render(`
    ${parentNav('patterns')}
    <h2>Viimased 4 nädalat</h2>
    <p class="hint">Sobib kaasa võtta arenguvestlusele. Vajuta „Prindi / PDF“.</p>
    <div class="card">
      <p>Õhtuseid sissekandeid: <b>${st.count}</b> · raskeid päevi: <b>${st.hardDays}</b></p>
      <p>Eesmärgid õnnestusid: <b>${st.goalRate === null ? '—' : `${Math.round(st.goalRate * 100)}%`}</b></p>
    </div>
    <div class="card"><h3>Rasked päevad nädalapäeviti</h3>
      <div class="bars">${st.weekday.map((w) => `<div class="bar"><div class="fill" style="height:${w.total ? (w.hard / w.total) * 100 : 0}%"></div><span>${w.label}</span><small>${w.hard}/${w.total}</small></div>`).join('')}</div>
      <p class="hint">Raske päev = vihane/kurb/mures tunne vähemalt keskmise tugevusega või eesmärk ei õnnestunud.</p>
    </div>
    <div class="card"><h3>Tunded</h3>
      ${EMOTIONS.map((e) => `<div class="hbar"><span>${e.emoji} ${e.label}</span><div><i style="width:${(st.emotionCounts[e.id] / max) * 100}%;background:${e.color}"></i></div><b>${st.emotionCounts[e.id]}</b></div>`).join('')}
    </div>
    <div class="card"><h3>Kus on raskem, kus parem</h3>
      ${CONTEXTS.map((c) => `<div class="hbar2"><span>${c.emoji} ${c.label}</span>
        <div><i class="hard" style="width:${(ctx.hard[c.id] / ctxMax) * 100}%"></i></div><b>${ctx.hard[c.id]}</b>
        <div><i class="good" style="width:${(ctx.good[c.id] / ctxMax) * 100}%"></i></div><b>${ctx.good[c.id]}</b></div>`).join('')}
      <p class="legend"><i class="hard"></i> kõige raskem <i class="good"></i> kõige parem</p>
    </div>
    <div class="card"><h3>Uni ja rasked päevad</h3>
      ${SLEEP.map((s) => `<p>${s.emoji} Magas ${s.label.toLowerCase()}: <b>${sleep[s.id].hard}/${sleep[s.id].days}</b> rasket päeva</p>`).join('')}
      <p class="hint">Arvesse lähevad päevad, kus on täidetud nii hommik kui õhtu.</p>
    </div>
    ${incidents.length ? `<div class="card"><h3>Juhtumid (${incidents.length})</h3>${incidents.map((x) => `<p><b>${x.date}</b> ${placeLabel(x.place)}<br>
      Enne: ${esc(x.before) || '—'} · Tegi: ${esc(x.behavior) || '—'} · Järgnes: ${esc(x.after) || '—'}</p>`).join('')}</div>` : ''}
    ${notes.length ? `<div class="card"><h3>Vanema märkused</h3>${notes.map(([d, v]) => `<p><b>${d}</b>: ${esc(v)}</p>`).join('')}</div>` : ''}
    <button class="btn" data-print>🖨️ Prindi / PDF</button>
  `, () => on('[data-print]', () => window.print()));
}

async function parentStars() {
  const ledger = (await db.all('stars')).sort((a, b) => b.ts - a.ts);
  const bal = starBalance(ledger);
  const s = await settings();
  render(`
    ${parentNav('stars')}
    <h2>Tähed: ⭐ ${bal}</h2>
    <div class="card"><h3>Anna boonustäht</h3>
      <p class="hint">Näiteks kui õpetaja kiitis või eKoolis märkust polnud. Kiida konkreetselt: „Sa tõstsid täna käe!“</p>
      <input data-reason placeholder="Mille eest?">
      <button class="btn" data-bonus>+1 ⭐</button>
    </div>
    <div class="card"><h3>Lunasta auhind</h3>
      ${s.rewards.filter((r) => r.text).map((r, i) => `<div class="ans"><span>${esc(r.text)} (${r.cost} ⭐)</span>
        <button class="btn small" data-redeem="${i}" ${bal < r.cost ? 'disabled' : ''}>Lunasta</button></div>`).join('')}
    </div>
    <div class="card"><h3>Ajalugu</h3>
      ${ledger.slice(0, 30).map((l) => `<p>${new Date(l.ts).toLocaleDateString('et-EE')} · ${l.delta > 0 ? '+' : ''}${l.delta} · ${esc(l.reason)}</p>`).join('') || '<p class="hint">Tühi</p>'}
    </div>
  `, () => {
    on('[data-bonus]', async () => { await addStar(1, $('[data-reason]').value || 'Boonus'); parentStars(); });
    on('[data-redeem]', async (ev) => {
      const r = s.rewards.filter((x) => x.text)[+ev.currentTarget.dataset.redeem];
      await addStar(-r.cost, `Auhind: ${r.text}`); parentStars();
    });
  });
}

function parentGuide() {
  render(`
    ${parentNav('guide')}
    <h2>Juhend vanemale</h2>
    <div class="card"><h3>Õhtune rituaal (3 min)</h3>
      <p>Tehke see alati samal ajal, näiteks pärast hammaste pesu. Ole lähedal, aga lase lapsel ise vajutada.
      Kuula tema vastused hiljem siit „Päevad“ vaatest ja kui midagi jäi silma, küsi järgmisel päeval uudishimuga, mitte etteheitega.</p>
    </div>
    <div class="card"><h3>Kui laps on vihane (emotsioonide juhendamine)</h3>
      <ol>
        <li><b>Märka</b> tunnet enne, kui see plahvatab.</li>
        <li><b>Nimeta</b> see: „Sa oled praegu väga vihane.“</li>
        <li><b>Tunnusta</b>: „Saan aru, see oli ebaõiglane tunne.“</li>
        <li><b>Piir käitumisele</b>, mitte tundele: „Vihane olla võib. Karjuda ei või.“</li>
        <li><b>Lahendus koos</b>: „Mida sa järgmine kord teha saaksid?“</li>
      </ol>
    </div>
    <div class="card"><h3>Kui ma ise vihastasin</h3>
      <p>Iga vanem ütleb vahel midagi halvasti. Oluline on <b>parandamine</b>: rahulikul hetkel tagasi tulla.</p>
      <p class="quote">„Hommikul olin ma vihane ja ütlesin midagi, mis ei ole tõsi. Vabandust. Ma armastan sind väga.
      Järgmine kord proovin enne hingata.“</p>
      <p>Nii näitad lapsele täpselt seda oskust, mida ta ise õpib.</p>
    </div>
    <div class="card"><h3>Selged korraldused</h3>
      <p>Lühike, üks asi korraga, lähedalt ja silmsidemega: „Pane jalanõud jalga.“
      Mitte küsimusena („Kas sa paneksid…?“). Kiida kohe, kui ta täidab.</p>
    </div>
    <div class="card"><h3>Tähed ja auhinnad</h3>
      <p>Tasu peab tulema kiiresti ja olema väike. Parimad auhinnad on ühine aeg (mäng, jalgpall), mitte toit ega ekraan.
      Ära võta teenitud tähti karistuseks ära.</p>
    </div>
  `);
}

async function parentSettings() {
  const s = await settings();
  const voiceRows = [
    ...s.plans.map((p, i) => ({ key: `voice:plan:${i}`, label: `Plaan ${i + 1}: KUI ${p.if}…` })),
    ...ALL_QUESTIONS.map((q) => ({ key: `voice:q:${q.id}`, label: q.text })),
  ];
  const voices = Object.fromEntries(await Promise.all(voiceRows.map(async (r) => [r.key, await getSetting(r.key, null)])));
  let persisted = null;
  try { persisted = await navigator.storage?.persisted?.(); } catch {}
  render(`
    ${parentNav('settings')}
    <h2>Seaded</h2>
    <div class="card"><h3>Eesmärgid (kuni 3)</h3>
      <p class="hint">Üks konkreetne käitumine, mida saab näha. Sõnastage koos lapsega.</p>
      ${[0, 1, 2].map((i) => `<input data-goal="${i}" value="${esc(s.goals[i] || '')}">`).join('')}
    </div>
    <div class="card"><h3>Kui-siis plaanid (kuni 3)</h3>
      ${[0, 1, 2].map((i) => `<div class="pair"><label>KUI</label><input data-pif="${i}" value="${esc(s.plans[i]?.if || '')}">
        <label>SIIS</label><input data-pthen="${i}" value="${esc(s.plans[i]?.then || '')}"></div>`).join('')}
    </div>
    <div class="card"><h3>Auhinnad</h3>
      ${[0, 1, 2, 3, 4].map((i) => `<div class="pair row"><input data-rtext="${i}" placeholder="Auhind" value="${esc(s.rewards[i]?.text || '')}">
        <input data-rcost="${i}" type="number" min="1" placeholder="⭐" value="${s.rewards[i]?.cost || ''}"></div>`).join('')}
    </div>
    <button class="btn big" data-save>Salvesta</button>
    <p class="hint" data-saved></p>
    <div class="card"><h3>Sinu hääl</h3>
      <p class="hint">Loe küsimused ja plaanid oma häälega sisse. Laps kuuleb sinu häält.</p>
      ${voiceRows.map((r) => `<div class="voicerow"><span>${esc(r.label)}</span><div data-voice="${r.key}"></div></div>`).join('')}
    </div>
    <div class="card"><h3>Andmed</h3>
      <p class="hint">Kõik andmed on ainult selles telefonis. ${persisted ? 'Püsimälu on lubatud ✓' : 'Lisa äpp avakuvale, et andmed ei kaoks.'}</p>
      <button class="btn" data-export>💾 Tee varukoopia</button>
      <label class="btn ghost">📂 Taasta varukoopia<input type="file" accept=".json" data-import hidden></label>
      <button class="btn ghost" data-pin>Muuda PIN-i</button>
      <button class="btn danger" data-wipe>Kustuta kõik andmed</button>
    </div>
  `, (root) => {
    for (const el of $$('[data-voice]', root)) {
      const key = el.dataset.voice;
      recorder(el, { audioId: voices[key], big: false, onSaved: (id) => setSetting(key, id) });
    }
    on('[data-save]', async () => {
      const goals = $$('[data-goal]').map((i) => i.value.trim()).filter(Boolean);
      const plans = [0, 1, 2].map((i) => ({ if: $(`[data-pif="${i}"]`).value.trim(), then: $(`[data-pthen="${i}"]`).value.trim() })).filter((p) => p.if && p.then);
      const rewards = [0, 1, 2, 3, 4].map((i) => ({ text: $(`[data-rtext="${i}"]`).value.trim(), cost: +$(`[data-rcost="${i}"]`).value })).filter((r) => r.text && r.cost > 0);
      await setSetting('goals', goals); await setSetting('plans', plans); await setSetting('rewards', rewards);
      const msg = $('[data-saved]');
      msg.textContent = 'Salvestatud ✓ Loon plaanidele häält…';
      const ok = (await Promise.all(plans.map((p) => ensureVoice(planSentence(p))))).every(Boolean);
      if (msg.isConnected) msg.textContent = ok ? 'Salvestatud ✓ Hääl valmis ✓' : 'Salvestatud ✓ Uute plaanide hääle loomiseks lülita korraks internet sisse ja salvesta uuesti.';
    });
    on('[data-export]', exportBackup);
    $('[data-import]').addEventListener('change', (ev) => importBackup(ev.target.files[0]));
    on('[data-pin]', async () => { await db.del('kv', 'pin'); parentGate(); });
    on('[data-wipe]', async () => {
      if (!confirm('Kas oled kindel? Kõik sissekanded, salvestused ja tähed kustutatakse.')) return;
      await db.clearAll(); home();
    });
  });
}

const PARENT_TABS = { days: parentDays, incidents: parentIncidents, patterns: parentPatterns, stars: parentStars, guide: parentGuide, settings: parentSettings };

// ---------- backup ----------
const blobToDataUrl = (b) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });

async function exportBackup() {
  const out = { version: 1, exportedAt: new Date().toISOString() };
  for (const s of ['entries', 'stars', 'incidents']) out[s] = await db.all(s);
  const kvKeys = await db.keys('kv');
  out.kv = Object.fromEntries(await Promise.all(kvKeys.map(async (k) => [k, await db.get('kv', k)])));
  const audioKeys = await db.keys('audio');
  out.audio = Object.fromEntries(await Promise.all(audioKeys.map(async (k) => [k, await blobToDataUrl(await db.get('audio', k))])));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' }));
  a.download = `tunnete-paevik-${dayKey()}.json`;
  a.click();
}

async function importBackup(file) {
  if (!file || !confirm('Taastamine asendab praegused andmed. Jätkan?')) return;
  const data = JSON.parse(await file.text());
  await db.clearAll();
  for (const e of data.entries || []) await db.put('entries', e);
  for (const s of data.stars || []) await db.put('stars', s);
  for (const x of data.incidents || []) await db.put('incidents', x);
  for (const [k, v] of Object.entries(data.kv || {})) await db.put('kv', v, k);
  for (const [k, v] of Object.entries(data.audio || {})) await db.put('audio', await (await fetch(v)).blob(), k);
  alert('Taastatud ✓');
  parentDays();
}

// ---------- boot ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
navigator.storage?.persist?.().catch(() => {});
home();
