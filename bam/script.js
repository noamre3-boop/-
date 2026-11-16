/* BY ANY MEANS — drop 001 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem('bam:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('bam:' + k, JSON.stringify(v)); } catch {} }
  };

  /* ---------- status bar ---------- */
  const clock = $('#clock');
  const tickClock = () => {
    const d = new Date();
    clock.textContent = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  tickClock(); setInterval(tickClock, 15000);

  // live-ish match score
  let home = 1, away = 0;
  setInterval(() => {
    if (Math.random() < .25) { Math.random() < .7 ? home++ : away++; $('#score').textContent = `${home}-${away}`; }
  }, 9000);

  // battery drains while you scroll
  let bat = 24;
  addEventListener('scroll', () => {
    const p = scrollY / (document.body.scrollHeight - innerHeight || 1);
    const v = Math.max(1, Math.round(24 - p * 20));
    if (v !== bat) { bat = v; $('#bat').textContent = bat; $('.bat').style.background = bat < 10 ? '#e8273a' : '#d9d6cf'; }
  }, { passive: true });

  /* ---------- hero scrawl (jacket print) ---------- */
  $('.scrawl').textContent = 'By Any Means Necessary. '.repeat(160);

  /* ---------- products & bag ---------- */
  const products = [
    { id: 'tn', name: 'Air Bubble "Crimson Wave"', note: 'Gradient mesh, red lace tips, full visible air', price: 849, img: 'img/tn.jpg', tag: 'HOT', hot: true },
    { id: 'gel', name: 'Gel Runner "Black Chrome"', note: 'Silver overlays, worn-in sole, 3 pics only', price: 599, img: 'img/gel.jpg', tag: 'USED · 9/10' },
    { id: 'tech', name: 'Tech Fleece Jogger', note: 'Black / heather grey panels, tapered', price: 429, img: 'img/tech.jpg', tag: 'RESTOCK' },
    { id: 'hood', name: 'Tiger × Shark Full-Zip', note: 'Split body, night camo, zips over the face', price: 1490, img: 'img/hoodie.jpg', tag: 'GRAIL', hot: true }
  ];
  const grid = $('#products');
  grid.innerHTML = products.map(p => `
    <article class="card reveal" data-id="${p.id}">
      <span class="tag ${p.hot ? 'hot' : ''}">${p.tag}</span>
      <div class="ph"><img src="${p.img}" alt="${p.name}" loading="lazy"></div>
      <div class="info">
        <h3>${p.name}</h3>
        <p>${p.note}</p>
        <div class="row"><span class="price">₪${p.price}</span><button data-add="${p.id}">Cop</button></div>
      </div>
    </article>`).join('');

  // tilt on hover
  $$('.card').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    });
    c.addEventListener('pointerleave', () => c.style.transform = '');
  });

  let bag = store.get('bag', []);
  const drawer = $('#drawer');
  const renderBag = () => {
    $('#bagCount').textContent = bag.length;
    const list = $('#bagList');
    list.innerHTML = bag.length ? bag.map((id, i) => {
      const p = products.find(x => x.id === id);
      return `<li><span>${p.name}</span><span>₪${p.price} <button data-rm="${i}" aria-label="Remove">✕</button></span></li>`;
    }).join('') : '<li class="empty">Bag is empty. Go cop something.</li>';
    $('#bagTotal').textContent = '₪' + bag.reduce((s, id) => s + products.find(x => x.id === id).price, 0).toLocaleString();
    $$('[data-add]').forEach(b => { const on = bag.includes(b.dataset.add); b.classList.toggle('added', on); b.textContent = on ? 'In bag ✓' : 'Cop'; });
    store.set('bag', bag);
  };
  grid.addEventListener('click', e => {
    const id = e.target.dataset.add; if (!id) return;
    bag.push(id); renderBag();
    const b = $('#bagBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  });
  $('#bagList').addEventListener('click', e => { if (e.target.dataset.rm != null) { bag.splice(+e.target.dataset.rm, 1); renderBag(); } });
  $('#bagBtn').onclick = () => { drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); };
  $('#closeBag').onclick = () => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); };
  $('#checkout').onclick = () => {
    if (!bag.length) return;
    $('#bagList').innerHTML = '<li class="empty">Order sent. Paid by any means. ✌</li>';
    bag = []; store.set('bag', bag); $('#bagCount').textContent = 0; $('#bagTotal').textContent = '₪0';
    $$('[data-add]').forEach(b => { b.classList.remove('added'); b.textContent = 'Cop'; });
  };
  renderBag();

  /* ---------- fit builder ---------- */
  const fitData = {
    TOP: [['Shark full-zip', 30, 'Shark'], ['Duck canvas jacket', 24, 'Canvas'], ['Black puffer + camo hood', 27, 'Puffer'], ['Box logo tee', 20, 'Box'], ["'07 away kit", 26, 'Seven']],
    BOTTOM: [['Tech fleece', 26, 'Tech'], ['Black sweats', 20, 'Sweats'], ['Orange gi pants', 14, 'Saiyan'], ['Baggy denim', 22, 'Denim']],
    FEET: [['Air bubble TN', 30, 'Bubble'], ['Gel runner', 27, 'Gel'], ['All-black 95s', 28, 'Ninety-Five'], ['Slides + socks', 10, 'Slides']],
    EXTRA: [['Wired earbuds', 8, 'Wired'], ['Over-ears', 10, 'Silent'], ['Backpack', 7, 'Campus'], ['Fan of cash', 12, 'Rich'], ['Peace sign', 9, 'Peace']]
  };
  const picks = { TOP: 0, BOTTOM: 0, FEET: 0, EXTRA: 0 };
  $('#fitPicks').innerHTML = Object.entries(fitData).map(([g, items]) => `
    <div class="fit-group"><h4>${g}</h4><div class="chips">
      ${items.map((it, i) => `<button class="chip" data-g="${g}" data-i="${i}">${it[0]}</button>`).join('')}
    </div></div>`).join('');
  let fitNo = 1;
  const verdicts = [[90, 'certified menace'], [80, 'they gonna screenshot this'], [70, 'clean. no notes.'], [55, 'mid but confident'], [0, 'go back inside']];
  const renderFit = () => {
    $$('.chip').forEach(c => c.classList.toggle('on', picks[c.dataset.g] === +c.dataset.i));
    const chosen = Object.keys(picks).map(g => fitData[g][picks[g]]);
    const raw = chosen.reduce((s, c) => s + c[1], 0);
    // synergy bonuses
    let bonus = 0;
    const has = n => chosen.some(c => c[2] === n);
    if (has('Shark') && has('Bubble')) bonus += 6;
    if (has('Saiyan') && has('Box')) bonus += 14;
    if (has('Canvas') && has('Campus')) bonus += 8;
    if (has('Seven') && has('Silent')) bonus += 6;
    if (has('Tech') && has('Gel')) bonus += 5;
    const score = Math.min(100, raw + bonus);
    $('#fitName').textContent = `${chosen[2][2]} ${chosen[0][2]} ${chosen[3][2]}`.toUpperCase();
    $('#meter').style.width = score + '%';
    $('#dripScore').textContent = score;
    $('#fitVerdict').textContent = verdicts.find(v => score >= v[0])[1];
    $('#fitNo').textContent = String(fitNo).padStart(4, '0');
  };
  $('#fitPicks').addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    picks[c.dataset.g] = +c.dataset.i; fitNo++; renderFit();
  });
  $('#shuffle').onclick = () => {
    for (const g in picks) picks[g] = Math.floor(Math.random() * fitData[g].length);
    fitNo++; renderFit();
  };
  renderFit();

  /* ---------- story ---------- */
  const prog = $('#storyProg');
  let sp = 0;
  setInterval(() => { sp = (sp + .5) % 100; prog.style.width = sp + '%'; }, 50);
  const toastEl = $('#storyToast');
  const msgs = { like: ['Liked ♥', 'Unliked'], share: ['Link copied', 'Link copied'], boost: ['Boosted to 10k ↑', 'Boost off'], save: ['Added to highlights', 'Removed'] };
  let toastT;
  $('.story-actions').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const on = b.classList.toggle('on');
    if (b.dataset.act === 'share') { try { navigator.clipboard.writeText(location.href + '#sketch'); } catch {} }
    toastEl.textContent = msgs[b.dataset.act][on ? 0 : 1];
    toastEl.classList.add('show'); clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), 1400);
  });

  /* ---------- audio engine ---------- */
  let ctx, master, analyser, dist;
  const initAudio = () => {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = .7;
    analyser = ctx.createAnalyser(); analyser.fftSize = 64;
    master.connect(analyser); analyser.connect(ctx.destination);
    dist = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3); }
    dist.curve = curve; dist.connect(master);
  };
  const noiseBuf = () => {
    const b = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate);
    const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };
  let nb;
  const noise = (t, dur, type, freq, vol) => {
    nb = nb || noiseBuf();
    const s = ctx.createBufferSource(); s.buffer = nb;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + .02);
  };
  const hat = (t, v = .25) => noise(t, .045, 'highpass', 8000, v);
  const snare = t => {
    noise(t, .18, 'bandpass', 2200, .7);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + .1);
    g.gain.setValueAtTime(.35, t); g.gain.exponentialRampToValueAtTime(.001, t + .12);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + .15);
  };
  const b808 = (t, f, dur = .5, slideTo) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 2.2, t); o.frequency.exponentialRampToValueAtTime(f, t + .03);
    if (slideTo) { o.frequency.setValueAtTime(f, t + dur * .55); o.frequency.exponentialRampToValueAtTime(slideTo, t + dur * .9); }
    g.gain.setValueAtTime(.9, t); g.gain.setValueAtTime(.9, t + dur * .7); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(dist); o.start(t); o.stop(t + dur + .05);
  };
  const bell = (t, f, v = .12) => {
    [1, 2.01].forEach((m, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = i ? 'sine' : 'triangle'; o.frequency.value = f * m;
      g.gain.setValueAtTime(v / (i + 1), t); g.gain.exponentialRampToValueAtTime(.001, t + .9);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 1);
    });
  };
  const tag = t => { // "ayy" — formant-ish sweep
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(170, t + .35);
    f.type = 'bandpass'; f.Q.value = 6; f.frequency.setValueAtTime(800, t); f.frequency.exponentialRampToValueAtTime(2200, t + .3);
    g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(.4, t + .03); g.gain.exponentialRampToValueAtTime(.001, t + .4);
    o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + .45);
  };

  // tracks: each a 32-step (2 bar) pattern at 16ths
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const tracks = [
    { name: 'Go Crazy (Drop 001 Freestyle)', bpm: 142, len: '2:41', root: 37,
      bass: { 0: [0, 3], 6: [0, 1.5], 10: [3, 2, 7], 16: [0, 3], 22: [-2, 1.5], 26: [5, 2, 0] },
      mel: [0, 3, 7, 3, 8, 7, 3, 2], snare: [8, 24], roll: [14, 15, 30, 31] },
    { name: 'Shark Full-Zip', bpm: 140, len: '2:18', root: 34,
      bass: { 0: [0, 4], 7: [0, 1], 10: [7, 2, 5], 16: [0, 3], 23: [3, 1], 26: [-2, 2, 0] },
      mel: [12, 10, 7, 10, 15, 14, 10, 7], snare: [8, 24], roll: [6, 7, 22, 23, 30, 31] },
    { name: 'Gold Calipers', bpm: 144, len: '3:02', root: 39,
      bass: { 0: [0, 2], 3: [0, 1], 6: [3, 2], 10: [0, 2, -5], 16: [0, 2], 19: [0, 1], 22: [7, 2], 26: [5, 2, 3] },
      mel: [7, 8, 7, 3, 0, 3, 5, 3], snare: [8, 24], roll: [12, 13, 14, 15, 28, 29, 30, 31] },
    { name: 'Mirror Flash', bpm: 138, len: '2:27', root: 32,
      bass: { 0: [0, 6], 12: [5, 2], 16: [0, 4], 24: [3, 2, 8] },
      mel: [0, 7, 12, 7, 3, 7, 10, 7], snare: [8, 24], roll: [15, 31] }
  ];
  let cur = 0, playing = false, step = 0, nextT = 0, timer;
  const schedule = () => {
    const tr = tracks[cur], s16 = 60 / tr.bpm / 4;
    while (nextT < ctx.currentTime + .12) {
      const st = step % 32, t = nextT;
      // hats: straight 8ths + triplet rolls
      if (tr.roll.includes(st)) { hat(t, .2); hat(t + s16 / 3, .15); hat(t + 2 * s16 / 3, .15); }
      else if (st % 2 === 0) hat(t, st % 4 === 0 ? .28 : .18);
      if (tr.snare.includes(st)) snare(t);
      if (st === 19 && Math.random() < .5) snare(t); // ghost
      const b = tr.bass[st];
      if (b) b808(t, N(tr.root + b[0]), b[1] * s16 * 1.9, b[2] != null ? N(tr.root + b[2]) : null);
      if (st % 4 === 0) bell(t, N(tr.root + 36 + tr.mel[(st / 4) % 8]));
      nextT += s16; step++;
    }
  };
  const bars = $('#bars');
  bars.innerHTML = '<i></i>'.repeat(32);
  const barEls = $$('i', bars);
  const data = new Uint8Array(32);
  const draw = () => {
    if (!playing) { barEls.forEach(b => b.style.height = '8%'); return; }
    analyser.getByteFrequencyData(data);
    barEls.forEach((b, i) => b.style.height = Math.max(6, data[i] / 2.55) + '%');
    requestAnimationFrame(draw);
  };
  const playBtn = $('#play');
  const start = () => {
    initAudio(); ctx.resume();
    playing = true; step = 0; nextT = ctx.currentTime + .05;
    clearInterval(timer); timer = setInterval(schedule, 25);
    playBtn.textContent = '❚❚'; playBtn.classList.add('on'); draw();
  };
  const stop = () => { playing = false; clearInterval(timer); playBtn.textContent = '▶'; playBtn.classList.remove('on'); };
  playBtn.onclick = () => playing ? stop() : start();

  const tl = $('#tracklist');
  tl.innerHTML = tracks.map((t, i) => `<li data-t="${i}"><span>${t.name}</span><em>${t.bpm} bpm · ${t.len}</em></li>`).join('');
  const setTrack = i => {
    cur = i; $('#trackName').textContent = tracks[i].name;
    $$('li', tl).forEach((li, j) => li.classList.toggle('cur', j === i));
  };
  tl.addEventListener('click', e => { const li = e.target.closest('li'); if (!li) return; setTrack(+li.dataset.t); if (!playing) start(); });
  setTrack(0);

  // pads
  const padDefs = [['808', 'q', t => b808(t, N(tracks[cur].root), .6, N(tracks[cur].root - 5))], ['Snare', 'w', snare], ['Hat roll', 'e', t => { for (let i = 0; i < 6; i++) hat(t + i * .035, .2); }], ['Ayy', 'r', tag], ['Bell', 't', t => bell(t, N(tracks[cur].root + 43), .2)]];
  $('#pads').innerHTML = padDefs.map((p, i) => `<button class="pad" data-p="${i}">${p[0]} <small>${p[1].toUpperCase()}</small></button>`).join('');
  const hit = i => {
    initAudio(); ctx.resume(); padDefs[i][2](ctx.currentTime + .01);
    const el = $(`[data-p="${i}"]`); el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 120);
  };
  $('#pads').addEventListener('pointerdown', e => { const b = e.target.closest('.pad'); if (b) hit(+b.dataset.p); });
  addEventListener('keydown', e => {
    if (e.target.matches('input,textarea')) return;
    const i = padDefs.findIndex(p => p[1] === e.key.toLowerCase());
    if (i >= 0) hit(i);
  });

  /* ---------- garage rev ---------- */
  const rpmEl = $('#rpm'), car = $('.car'), gauge = $('.gauge');
  let rpm = 800, revving = false, eng, engGain;
  const revBtn = $('#rev');
  const engineOn = () => {
    initAudio(); ctx.resume();
    if (!eng) {
      eng = ctx.createOscillator(); eng.type = 'sawtooth';
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
      engGain = ctx.createGain(); engGain.gain.value = 0;
      eng.connect(f); f.connect(engGain); engGain.connect(master); eng.start();
    }
  };
  const down = e => { e.preventDefault(); engineOn(); revving = true; car.classList.add('shake'); };
  const up = () => { revving = false; car.classList.remove('shake'); };
  revBtn.addEventListener('pointerdown', down);
  addEventListener('pointerup', up); revBtn.addEventListener('pointerleave', up);
  setInterval(() => {
    rpm += revving ? (7200 - rpm) * .12 : (800 - rpm) * .08;
    rpmEl.textContent = Math.round(rpm / 10) * 10;
    gauge.style.transform = `rotate(${(rpm - 800) / 6400 * 200}deg)`;
    rpmEl.parentElement.style.setProperty('--r', rpm);
    $('.g-num').style.transform = `rotate(${-(rpm - 800) / 6400 * 200}deg)`;
    $('.g-lbl').style.transform = `rotate(${-(rpm - 800) / 6400 * 200}deg)`;
    if (eng) {
      eng.frequency.setTargetAtTime(30 + rpm / 60, ctx.currentTime, .05);
      engGain.gain.setTargetAtTime(revving || rpm > 900 ? .18 : 0, ctx.currentTime, .1);
    }
  }, 40);

  /* ---------- gym ---------- */
  const routine = [
    ['Pull-ups', '4 × max'], ['Incline DB press', '4 × 8–10'], ['Lateral raises', '4 × 15'],
    ['Rows', '3 × 10'], ['Hanging leg raises', '3 × 12'], ['Side profile check', '1 pic'],
    ['Sketch 30 min', 'no phone'], ['Water 3L', '—']
  ];
  const todayKey = 'gym:' + new Date().toDateString();
  let done = store.get(todayKey, []);
  const checks = $('#checks');
  const gymMsgs = ['get up.', 'warm-up done. keep going.', 'halfway. no excuses.', 'almost there.', 'built different. ✌'];
  const renderGym = () => {
    checks.innerHTML = routine.map((r, i) => `<li class="${done.includes(i) ? 'done' : ''}" data-i="${i}"><span class="box">${done.includes(i) ? '✓' : ''}</span><span class="what">${r[0]}</span><span class="sets">${r[1]}</span></li>`).join('');
    $('#doneCount').textContent = done.length; $('#totalCount').textContent = routine.length;
    $('#gymMsg').textContent = gymMsgs[Math.min(4, Math.floor(done.length / routine.length * 4.01))];
    store.set(todayKey, done);
  };
  checks.addEventListener('click', e => {
    const li = e.target.closest('li'); if (!li) return;
    const i = +li.dataset.i; done = done.includes(i) ? done.filter(x => x !== i) : [...done, i]; renderGym();
  });
  $('#resetGym').onclick = () => { done = []; renderGym(); };
  renderGym();

  /* ---------- reveal on scroll ---------- */
  $$('.head, .fit, .story, .sketch-copy, .garage-wrap, .player, .tracklist, .gym-wrap, .tile').forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));
})();
