/* BY ANY MEANS — drop 001 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('bam:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('bam:' + k, JSON.stringify(v)); } catch {} }
  };
  const toast = (() => { let t; return msg => { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(t); t = setTimeout(() => el.classList.remove('show'), 1600); }; })();

  /* ---------- all pictures ---------- */
  const PICS = {
    tn: 'img/tn.jpg', carhartt: 'img/carhartt.jpg', bed: 'img/bed.jpg', tech: 'img/tech.jpg', goku: 'img/goku.jpg',
    sketch: 'img/sketch.jpg', gel: 'img/gel.jpg', mirror: 'img/mirror.jpg', shhh: 'img/shhh.jpg', hood: 'img/hood.jpg',
    crown: 'img/crown.jpg', rayman: 'img/rayman.jpg', dinner: 'img/dinner.jpg', gym: 'img/gym.jpg', cash: 'img/cash.jpg',
    hoodie: 'img/hoodie.jpg', gohan: 'img/gohan.jpg', vette: 'img/vette.jpg'
  };
  const LABELS = {
    tn: 'crimson wave', carhartt: 'duck canvas ✌', bed: '3am', tech: 'tech fleece', goku: 'saiyan drip', sketch: 'guts',
    gel: 'gel chrome', mirror: 'flash on', shhh: 'shhh.', hood: 'camo hood', crown: 'royalty', rayman: 'no arms ✌',
    dinner: 'date night', gym: 'side profile', cash: 'go crazy', hoodie: 'grail', gohan: 'away kit', vette: 'gold calipers'
  };

  /* ---------- clocks ---------- */
  const fmt = d => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
  const tickClock = () => {
    const d = new Date(), t = fmt(d);
    $('#clock').textContent = t; $('#lockTime').textContent = t; $('#lockClock2').textContent = t;
    $('#lockDate').textContent = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  };
  tickClock(); setInterval(tickClock, 10000);

  let home = 1, away = 0;
  setInterval(() => { if (Math.random() < .25) { Math.random() < .7 ? home++ : away++; $('#score').textContent = `${home}-${away}`; } }, 9000);

  addEventListener('scroll', () => {
    const p = scrollY / (document.body.scrollHeight - innerHeight || 1);
    const v = Math.max(1, Math.round(24 - p * 22));
    $('#bat').textContent = v; $('.bat').style.background = v < 10 ? '#e8273a' : '#d9d6cf';
  }, { passive: true });

  /* ---------- custom cursor ---------- */
  const cur = $('#cursor');
  addEventListener('pointermove', e => {
    cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    cur.classList.toggle('big', !!e.target.closest('.pol,.panel,.card,.ring,.pcard'));
  }, { passive: true });

  /* ---------- lock screen ---------- */
  const lock = $('#lock');
  document.body.classList.add('locked');
  const openLock = () => {
    if (lock.classList.contains('open')) return;
    lock.classList.add('open'); document.body.classList.remove('locked');
    setTimeout(() => lock.classList.add('gone'), 750);
    setTimeout(dealWall, 250);
  };
  let ly = null;
  lock.addEventListener('pointerdown', e => ly = e.clientY);
  lock.addEventListener('pointermove', e => { if (ly != null && ly - e.clientY > 0) lock.style.transform = `translateY(${-(ly - e.clientY)}px)`; });
  lock.addEventListener('pointerup', e => { lock.style.transform = ''; if (ly != null) openLock(); ly = null; });
  addEventListener('keydown', e => { if (!lock.classList.contains('open') && (e.key === 'Enter' || e.key === ' ')) openLock(); });

  /* ---------- wall (draggable moodboard) ---------- */
  $('.scrawl').textContent = 'By Any Means Necessary. '.repeat(220);
  const board = $('#board');
  const keys = Object.keys(PICS);
  let z = 10;
  board.innerHTML = keys.map((k, i) => `<div class="pol tape${i % 3 + 1}" data-k="${k}"><img src="${PICS[k]}" alt="${LABELS[k]}" draggable="false"><span>${LABELS[k]}</span></div>`).join('');
  const pols = $$('.pol', board);
  const polW = () => innerWidth < 600 ? rnd(88, 108) : rnd(140, 190);
  const place = (el, x, y, r, delay = 0) => {
    el.style.transition = 'transform .8s cubic-bezier(.3,1.3,.5,1)';
    el.style.transitionDelay = delay + 's';
    el.dataset.x = x; el.dataset.y = y; el.dataset.r = r;
    el.style.transform = `translate(${x}px,${y}px) rotate(${r}deg)`;
    setTimeout(() => { el.style.transition = 'box-shadow .2s'; el.style.transitionDelay = '0s'; }, 900 + delay * 1000);
  };
  const scatter = () => {
    const W = board.clientWidth, H = board.clientHeight;
    const cols = innerWidth < 600 ? 3 : 6, rows = Math.ceil(pols.length / cols);
    const order = pols.slice().sort(() => Math.random() - .5);
    order.forEach((el, i) => {
      const w = el.offsetWidth;
      const cx = (i % cols + .5) * W / cols, cy = (Math.floor(i / cols) + .5) * (H * .82) / rows + H * .02;
      place(el, Math.max(0, Math.min(W - w, cx - w / 2 + rnd(-30, 30))), Math.max(0, Math.min(H - el.offsetHeight - 80, cy - el.offsetHeight / 2 + rnd(-25, 25))), rnd(-14, 14), i * .04);
      el.style.zIndex = ++z;
    });
  };
  const stack = () => {
    const W = board.clientWidth, H = board.clientHeight;
    pols.forEach((el, i) => { place(el, W / 2 - el.offsetWidth / 2 + rnd(-20, 20), H / 2 - el.offsetHeight / 2 + rnd(-20, 20), rnd(-20, 20), i * .03); el.style.zIndex = ++z; });
  };
  function dealWall() {
    pols.forEach(el => {
      el.style.width = polW() + 'px';
      el.style.transition = 'none';
      el.style.transform = `translate(${board.clientWidth / 2}px,${board.clientHeight + 200}px) rotate(${rnd(-40, 40)}deg)`;
    });
    requestAnimationFrame(() => requestAnimationFrame(scatter));
  }
  // drag
  let drag = null, lastTap = { k: null, t: 0 };
  board.addEventListener('pointerdown', e => {
    const el = e.target.closest('.pol'); if (!el) return;
    el.setPointerCapture(e.pointerId);
    el.classList.add('drag'); el.style.zIndex = ++z; el.style.transition = 'box-shadow .2s';
    drag = { el, sx: e.clientX, sy: e.clientY, x: +el.dataset.x, y: +el.dataset.y, moved: false };
  });
  board.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    const nx = drag.x + dx, ny = drag.y + dy, r = +drag.el.dataset.r + Math.max(-12, Math.min(12, (e.movementX || 0) * .8));
    drag.el.style.transform = `translate(${nx}px,${ny}px) rotate(${r}deg) scale(1.06)`;
    drag.nx = nx; drag.ny = ny; drag.nr = r;
  });
  const endDrag = () => {
    if (!drag) return;
    const { el } = drag;
    el.classList.remove('drag');
    if (drag.moved) { el.dataset.x = drag.nx; el.dataset.y = drag.ny; el.dataset.r = drag.nr * .6; }
    el.style.transform = `translate(${el.dataset.x}px,${el.dataset.y}px) rotate(${el.dataset.r}deg)`;
    if (!drag.moved) {
      const now = Date.now();
      if (lastTap.k === el.dataset.k && now - lastTap.t < 350) openLB(el.dataset.k);
      lastTap = { k: el.dataset.k, t: now };
    }
    drag = null;
  };
  board.addEventListener('pointerup', endDrag); board.addEventListener('pointercancel', endDrag);
  $('#shuffleWall').onclick = scatter; $('#stackWall').onclick = stack;
  let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { if (lock.classList.contains('open')) scatter(); }, 300); });

  // lightbox
  const lb = $('#lightbox');
  const openLB = k => { $('#lbImg').src = PICS[k]; $('#lbCap').textContent = LABELS[k]; lb.classList.add('open'); };
  lb.onclick = () => lb.classList.remove('open');

  /* ---------- stories ---------- */
  const stories = [
    { k: 'mirror', name: 'flash', cap: 'flash on. bangs fixed.', ago: '2m' },
    { k: 'hood', name: 'camo', cap: 'class is boring 🤫', ago: '14m' },
    { k: 'bed', name: '3am', cap: "can't sleep", ago: '31m' },
    { k: 'sketch', name: 'sketch', cap: 'no undo.', ago: '5m' },
    { k: 'carhartt', name: 'canvas', cap: 'peace ✌', ago: '1h' },
    { k: 'gym', name: 'gym', cap: 'week 12. side profile.', ago: '2h' },
    { k: 'cash', name: 'go crazy', cap: '🎵 Go Crazy', ago: '3h' },
    { k: 'crown', name: 'royalty', cap: 'filter king 👑', ago: '5h' },
    { k: 'dinner', name: 'date', cap: 'table for two', ago: '8h' }
  ];
  const seen = new Set(store.get('seen', []));
  const rings = $('#rings');
  const renderRings = () => rings.innerHTML = stories.map((s, i) => `<button class="ring ${seen.has(i) ? 'seen' : ''}" data-i="${i}"><span class="r-img"><img src="${PICS[s.k]}" alt=""></span>${s.name}</button>`).join('');
  renderRings();
  const viewer = $('#viewer'), vBars = $('#vBars');
  vBars.innerHTML = stories.map(() => '<i><b></b></i>').join('');
  let si = 0, sStart = 0, sRaf, paused = false, pausedAt = 0;
  const DUR = 4500;
  const showStory = i => {
    if (i < 0) i = 0;
    if (i >= stories.length) return closeStory();
    si = i; const s = stories[i];
    const img = $('#vImg'); img.src = PICS[s.k]; img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
    $('#vAv').style.backgroundImage = `url(${PICS[s.k]})`;
    $('#vName').textContent = s.name; $('#vAgo').textContent = s.ago; $('#vCap').textContent = s.cap;
    $$('i', vBars).forEach((b, j) => { b.classList.toggle('done', j < i); b.firstChild.style.width = j < i ? '100%' : '0'; });
    seen.add(i); store.set('seen', [...seen]);
    sStart = performance.now();
  };
  const loop = now => {
    if (!paused) {
      const p = (now - sStart) / DUR;
      $$('i', vBars)[si].firstChild.style.width = Math.min(100, p * 100) + '%';
      if (p >= 1) showStory(si + 1);
    }
    if (viewer.classList.contains('open')) sRaf = requestAnimationFrame(loop);
  };
  const openStory = i => { viewer.classList.add('open'); document.body.style.overflow = 'hidden'; showStory(i); cancelAnimationFrame(sRaf); sRaf = requestAnimationFrame(loop); };
  function closeStory() { viewer.classList.remove('open'); document.body.style.overflow = ''; cancelAnimationFrame(sRaf); renderRings(); }
  rings.addEventListener('click', e => { const r = e.target.closest('.ring'); if (r) openStory(+r.dataset.i); });
  $('#vNext').onclick = () => showStory(si + 1);
  $('#vPrev').onclick = () => showStory(si - 1);
  $('#vClose').onclick = closeStory;
  const reply = $('#vReply');
  reply.addEventListener('focus', () => { paused = true; pausedAt = performance.now(); });
  reply.addEventListener('blur', () => { paused = false; sStart += performance.now() - pausedAt; });
  reply.addEventListener('keydown', e => { if (e.key === 'Enter' && reply.value.trim()) { reply.value = ''; toast('Sent ✓'); reply.blur(); } });
  const burst = () => {
    const b = $('#vBurst');
    for (let i = 0; i < 8; i++) {
      const h = document.createElement('span'); h.className = 'heart'; h.textContent = ['❤️', '🔥', '😮‍💨', '✌️'][i % 4];
      h.style.left = rnd(35, 65) + '%'; h.style.top = rnd(55, 75) + '%'; h.style.animationDelay = i * .06 + 's';
      b.appendChild(h); setTimeout(() => h.remove(), 1800);
    }
  };
  $('#vHeart').onclick = burst;
  $('#vImg').addEventListener('dblclick', burst);
  addEventListener('keydown', e => {
    if (!viewer.classList.contains('open') || e.target === reply) return;
    if (e.key === 'ArrowRight') showStory(si + 1);
    if (e.key === 'ArrowLeft') showStory(si - 1);
    if (e.key === 'Escape') closeStory();
  });

  /* ---------- products & bag ---------- */
  const products = [
    { id: 'tn', name: 'Air Bubble "Crimson Wave"', note: 'Gradient mesh, red lace tips, full air', price: 849, img: PICS.tn, tag: 'HOT', hot: true },
    { id: 'gel', name: 'Gel Runner "Black Chrome"', note: 'Silver overlays, worn-in sole', price: 599, img: PICS.gel, tag: 'USED · 9/10' },
    { id: 'tech', name: 'Tech Fleece Jogger', note: 'Black / heather grey panels', price: 429, img: PICS.tech, tag: 'RESTOCK' },
    { id: 'hood', name: 'Tiger × Shark Full-Zip', note: 'Split body, night camo, zips to the face', price: 1490, img: PICS.hoodie, tag: 'GRAIL', hot: true },
    { id: 'canvas', name: 'Duck Canvas Active Jacket', note: 'Faded moss, thermal lining, logo patch', price: 690, img: PICS.carhartt, tag: 'VINTAGE' },
    { id: 'puffer', name: 'Puffer + Red Camo Hood', note: 'Quilted black shell, camo zip hood', price: 980, img: PICS.hood, tag: 'NEW' }
  ];
  const grid = $('#products');
  grid.innerHTML = products.map(p => `
    <article class="card reveal" data-id="${p.id}">
      <span class="tag ${p.hot ? 'hot' : ''}">${p.tag}</span>
      <div class="ph"><img src="${p.img}" alt="${p.name}" loading="lazy"></div>
      <div class="info"><h3>${p.name}</h3><p>${p.note}</p>
        <div class="row"><span class="price">₪${p.price}</span><button data-add="${p.id}">Cop</button></div></div>
    </article>`).join('');
  $$('.card').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    });
    c.addEventListener('pointerleave', () => c.style.transform = '');
  });
  let bag = store.get('bag', []).filter(id => products.some(p => p.id === id));
  const drawer = $('#drawer');
  const renderBag = () => {
    $('#bagCount').textContent = bag.length;
    $('#bagList').innerHTML = bag.length ? bag.map((id, i) => {
      const p = products.find(x => x.id === id);
      return `<li><img src="${p.img}" alt=""><span style="flex:1">${p.name}</span><span>₪${p.price} <button data-rm="${i}" aria-label="Remove">✕</button></span></li>`;
    }).join('') : '<li class="empty">Bag is empty. Go cop something.</li>';
    $('#bagTotal').textContent = '₪' + bag.reduce((s, id) => s + products.find(x => x.id === id).price, 0).toLocaleString();
    $$('[data-add]').forEach(b => { const on = bag.includes(b.dataset.add); b.classList.toggle('added', on); b.textContent = on ? 'In bag ✓' : 'Cop'; });
    store.set('bag', bag);
  };
  grid.addEventListener('click', e => {
    const id = e.target.dataset.add; if (!id) return;
    bag.push(id); renderBag(); toast('Added to bag');
    const b = $('#bagBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  });
  $('#bagList').addEventListener('click', e => { if (e.target.dataset.rm != null) { bag.splice(+e.target.dataset.rm, 1); renderBag(); } });
  $('#bagBtn').onclick = () => drawer.classList.add('open');
  $('#closeBag').onclick = () => drawer.classList.remove('open');
  $('#checkout').onclick = () => {
    if (!bag.length) return;
    bag = []; renderBag(); drawer.classList.remove('open');
    rain(['👟', '💸', '📦'], 30); toast('Order sent. Paid by any means ✌');
  };
  renderBag();

  /* ---------- fit builder ---------- */
  const fitData = {
    TOP: [['Shark full-zip', 30, 'Shark', PICS.hoodie], ['Duck canvas jacket', 24, 'Canvas', PICS.carhartt], ['Puffer + camo hood', 27, 'Puffer', PICS.hood], ['Box logo tee', 20, 'Box', PICS.goku], ["'07 away kit", 26, 'Seven', PICS.gohan], ['Black hoodie + vest', 23, 'Corner', PICS.cash]],
    BOTTOM: [['Tech fleece', 26, 'Tech', PICS.tech], ['Black sweats', 20, 'Sweats', PICS.cash], ['Orange gi pants', 14, 'Saiyan', PICS.goku]],
    FEET: [['Air bubble TN', 30, 'Bubble', PICS.tn], ['Gel runner', 27, 'Gel', PICS.gel], ['All-black 95s', 28, 'Ninety-Five', PICS.cash]]
  };
  const picks = { TOP: 0, BOTTOM: 0, FEET: 0 };
  $('#fitPicks').innerHTML = Object.entries(fitData).map(([g, items]) => `
    <div class="fit-group"><h4>${g}</h4><div class="chips">
      ${items.map((it, i) => `<button class="chip" data-g="${g}" data-i="${i}">${it[0]}</button>`).join('')}
    </div></div>`).join('');
  $('#fitStack').innerHTML = '<div></div><div></div><div></div>';
  let fitNo = 1;
  const verdicts = [[85, 'certified menace'], [75, 'they gonna screenshot this'], [65, 'clean. no notes.'], [55, 'mid but confident'], [0, 'go back inside']];
  const renderFit = changed => {
    $$('.chip').forEach(c => c.classList.toggle('on', picks[c.dataset.g] === +c.dataset.i));
    const groups = Object.keys(picks), chosen = groups.map(g => fitData[g][picks[g]]);
    let score = chosen.reduce((s, c) => s + c[1], 0) + 10;
    const has = n => chosen.some(c => c[2] === n);
    if (has('Shark') && has('Bubble')) score += 8;
    if (has('Saiyan') && has('Box')) score += 30;
    if (has('Canvas') && has('Gel')) score += 7;
    if (has('Corner') && has('Ninety-Five') && has('Sweats')) score += 14;
    if (has('Seven') && has('Tech')) score += 6;
    score = Math.min(100, score);
    $$('#fitStack div').forEach((d, i) => {
      d.style.backgroundImage = `url(${chosen[i][3]})`;
      if (!changed || changed === groups[i]) { d.classList.remove('flip'); void d.offsetWidth; d.classList.add('flip'); }
    });
    $('#fitName').textContent = `${chosen[2][2]} ${chosen[0][2]} ${chosen[1][2]}`.toUpperCase();
    $('#meter').style.width = score + '%';
    $('#dripScore').textContent = score;
    $('#fitVerdict').textContent = verdicts.find(v => score >= v[0])[1];
    $('#fitNo').textContent = String(fitNo).padStart(4, '0');
    if (score >= 95 && changed) rain(['💧', '🔥'], 14);
  };
  $('#fitPicks').addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    picks[c.dataset.g] = +c.dataset.i; fitNo++; renderFit(c.dataset.g);
  });
  $('#shuffle').onclick = () => { for (const g in picks) picks[g] = Math.floor(Math.random() * fitData[g].length); fitNo++; renderFit(); };
  renderFit();

  /* ---------- no. 7 ---------- */
  $('#pcard').onclick = () => $('#pcard').classList.toggle('flipped');
  $('#pcard').addEventListener('pointermove', e => {
    if ($('#pcard').classList.contains('flipped')) return;
    const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    e.currentTarget.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 18}deg)`;
  });
  $('#pcard').addEventListener('pointerleave', e => e.currentTarget.style.transform = '');
  $('#pcard').addEventListener('click', e => e.currentTarget.style.transform = '');

  /* ---------- fx ---------- */
  const fx = $('#fx');
  function rain(chars, n = 24) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span'); s.className = 'bit'; s.textContent = chars[i % chars.length];
      s.style.left = rnd(0, 100) + 'vw'; s.style.animationDuration = rnd(1.6, 3.2) + 's'; s.style.animationDelay = rnd(0, .8) + 's';
      fx.appendChild(s); setTimeout(() => s.remove(), 4200);
    }
  }
  const bigWord = w => { const d = document.createElement('div'); d.className = 'big-word'; d.textContent = w; fx.appendChild(d); setTimeout(() => d.remove(), 1700); };
  const siu = () => { bigWord('SIUUU'); rain(['⚽', '7️⃣', '🏆'], 30); sfx('siu'); };
  $('#siu').onclick = siu;
  const goku = () => { document.body.classList.remove('ssj'); void document.body.offsetWidth; document.body.classList.add('ssj'); bigWord('SUPER'); rain(['⚡', '🔥', '💥'], 30); sfx('ssj'); setTimeout(() => document.body.classList.remove('ssj'), 6000); };
  const drip = () => { bigWord('DRIP'); rain(['💧', '👟', '🧥', '💎'], 36); };
  let typed = '';
  addEventListener('keydown', e => {
    if (e.target.matches('input,textarea')) return;
    typed = (typed + e.key.toLowerCase()).slice(-8);
    if (typed.endsWith('goku')) goku();
    else if (typed.endsWith('siu')) siu();
    else if (typed.endsWith('drip')) drip();
  });

  /* ---------- comic / scouter ---------- */
  const powEl = $('#power'), scouter = $('.scouter');
  let powAnim;
  $$('.panel[data-power]').forEach(p => p.addEventListener('click', () => {
    p.classList.remove('hit'); void p.offsetWidth; p.classList.add('hit');
    const target = +p.dataset.power, t0 = performance.now();
    scouter.classList.remove('over'); $('#powerMsg').textContent = 'scanning…';
    $('#powerBar').style.width = Math.min(100, target / 90) + '%';
    cancelAnimationFrame(powAnim);
    const step = now => {
      const k = Math.min(1, (now - t0) / 1100);
      powEl.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))).toLocaleString();
      if (k < 1) powAnim = requestAnimationFrame(step);
      else if (target > 9000) { scouter.classList.add('over'); $('#powerMsg').textContent = "it's over 9000!!"; sfx('ssj'); }
      else $('#powerMsg').textContent = target > 7000 ? 'royal levels of aura' : 'respectable. keep training.';
    };
    powAnim = requestAnimationFrame(step);
  }));

  /* ---------- flashlight sketch ---------- */
  const flash = $('#flash');
  flash.addEventListener('pointermove', e => {
    const r = flash.getBoundingClientRect();
    flash.style.setProperty('--x', (e.clientX - r.left) + 'px'); flash.style.setProperty('--y', (e.clientY - r.top) + 'px');
  });
  $('#lightsOn').onclick = e => { const on = flash.classList.toggle('on'); e.target.textContent = on ? 'Lights off' : 'Lights on'; };

  /* ---------- audio engine ---------- */
  let ctx, master, analyser, dist, nb;
  const initAudio = () => {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = .7;
    analyser = ctx.createAnalyser(); analyser.fftSize = 64;
    master.connect(analyser); analyser.connect(ctx.destination);
    dist = ctx.createWaveShaper();
    const curve = new Float32Array(256); for (let i = 0; i < 256; i++) curve[i] = Math.tanh((i / 128 - 1) * 3);
    dist.curve = curve; dist.connect(master);
  };
  const noise = (t, dur, type, freq, vol) => {
    if (!nb) { nb = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
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
  const vox = (t, f0, f1, dur, fa, fb) => {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    f.type = 'bandpass'; f.Q.value = 6; f.frequency.setValueAtTime(fa, t); f.frequency.exponentialRampToValueAtTime(fb, t + dur * .8);
    g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(.4, t + .03); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
  };
  const tag = t => vox(t, 260, 170, .4, 800, 2200);
  function sfx(kind) {
    initAudio(); ctx.resume(); const t = ctx.currentTime + .02;
    if (kind === 'siu') { vox(t, 300, 520, .9, 2500, 3200); noise(t, 1.2, 'bandpass', 1200, .25); }
    if (kind === 'ssj') { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(60, t); o.frequency.exponentialRampToValueAtTime(900, t + 1.4); g.gain.setValueAtTime(.15, t); g.gain.exponentialRampToValueAtTime(.001, t + 1.6); o.connect(g); g.connect(dist); o.start(t); o.stop(t + 1.7); noise(t, 1.5, 'highpass', 3000, .2); }
  }

  const N = n => 440 * Math.pow(2, (n - 69) / 12);
  const tracks = [
    { name: 'Go Crazy (Drop 001 Freestyle)', bpm: 142, len: '2:41', root: 37, bass: { 0: [0, 3], 6: [0, 1.5], 10: [3, 2, 7], 16: [0, 3], 22: [-2, 1.5], 26: [5, 2, 0] }, mel: [0, 3, 7, 3, 8, 7, 3, 2], snare: [8, 24], roll: [14, 15, 30, 31] },
    { name: 'Shark Full-Zip', bpm: 140, len: '2:18', root: 34, bass: { 0: [0, 4], 7: [0, 1], 10: [7, 2, 5], 16: [0, 3], 23: [3, 1], 26: [-2, 2, 0] }, mel: [12, 10, 7, 10, 15, 14, 10, 7], snare: [8, 24], roll: [6, 7, 22, 23, 30, 31] },
    { name: 'Gold Calipers', bpm: 144, len: '3:02', root: 39, bass: { 0: [0, 2], 3: [0, 1], 6: [3, 2], 10: [0, 2, -5], 16: [0, 2], 19: [0, 1], 22: [7, 2], 26: [5, 2, 3] }, mel: [7, 8, 7, 3, 0, 3, 5, 3], snare: [8, 24], roll: [12, 13, 14, 15, 28, 29, 30, 31] },
    { name: 'Mirror Flash', bpm: 138, len: '2:27', root: 32, bass: { 0: [0, 6], 12: [5, 2], 16: [0, 4], 24: [3, 2, 8] }, mel: [0, 7, 12, 7, 3, 7, 10, 7], snare: [8, 24], roll: [15, 31] },
    { name: 'Shhh (Away End)', bpm: 146, len: '1:57', root: 36, bass: { 0: [0, 2], 4: [0, 2], 8: [3, 2], 12: [5, 2, 7], 16: [0, 2], 20: [0, 2], 24: [-2, 2], 28: [-4, 2, 0] }, mel: [12, 12, 10, 8, 7, 8, 10, 3], snare: [8, 24], roll: [10, 11, 26, 27] }
  ];
  let curT = 0, playing = false, step = 0, nextT = 0, timer;
  const schedule = () => {
    const tr = tracks[curT], s16 = 60 / tr.bpm / 4;
    while (nextT < ctx.currentTime + .12) {
      const st = step % 32, t = nextT;
      if (tr.roll.includes(st)) { hat(t, .2); hat(t + s16 / 3, .15); hat(t + 2 * s16 / 3, .15); }
      else if (st % 2 === 0) hat(t, st % 4 === 0 ? .28 : .18);
      if (tr.snare.includes(st)) snare(t);
      if (st === 19 && Math.random() < .5) snare(t);
      const b = tr.bass[st];
      if (b) b808(t, N(tr.root + b[0]), b[1] * s16 * 1.9, b[2] != null ? N(tr.root + b[2]) : null);
      if (st % 4 === 0) bell(t, N(tr.root + 36 + tr.mel[(st / 4) % 8]));
      nextT += s16; step++;
    }
  };
  const bars = $('#bars'); bars.innerHTML = '<i></i>'.repeat(32);
  const barEls = $$('i', bars), data = new Uint8Array(32);
  const draw = () => {
    if (!playing) { barEls.forEach(b => b.style.height = '8%'); return; }
    analyser.getByteFrequencyData(data);
    barEls.forEach((b, i) => b.style.height = Math.max(6, data[i] / 2.55) + '%');
    requestAnimationFrame(draw);
  };
  const playBtn = $('#play'), cover = $('#cover');
  const start = () => {
    initAudio(); ctx.resume();
    playing = true; step = 0; nextT = ctx.currentTime + .05;
    clearInterval(timer); timer = setInterval(schedule, 25);
    playBtn.textContent = '❚❚'; playBtn.classList.add('on'); cover.classList.add('spin'); draw();
  };
  const stop = () => { playing = false; clearInterval(timer); playBtn.textContent = '▶'; playBtn.classList.remove('on'); cover.classList.remove('spin'); };
  playBtn.onclick = () => playing ? stop() : start();
  const tl = $('#tracklist');
  tl.innerHTML = tracks.map((t, i) => `<li data-t="${i}"><span>${t.name}</span><em>${t.bpm} bpm · ${t.len}</em></li>`).join('');
  const setTrack = i => { curT = i; $('#trackName').textContent = tracks[i].name; $$('li', tl).forEach((li, j) => li.classList.toggle('cur', j === i)); };
  tl.addEventListener('click', e => { const li = e.target.closest('li'); if (!li) return; setTrack(+li.dataset.t); if (!playing) start(); });
  setTrack(0);
  const padDefs = [
    ['808', 'q', t => b808(t, N(tracks[curT].root), .6, N(tracks[curT].root - 5))], ['Snare', 'w', snare],
    ['Hat roll', 'e', t => { for (let i = 0; i < 6; i++) hat(t + i * .035, .2); }], ['Ayy', 'r', tag],
    ['Bell', 't', t => bell(t, N(tracks[curT].root + 43), .2)]
  ];
  $('#pads').innerHTML = padDefs.map((p, i) => `<button class="pad" data-p="${i}">${p[0]} <small>${p[1].toUpperCase()}</small></button>`).join('');
  const hit = i => {
    initAudio(); ctx.resume(); padDefs[i][2](ctx.currentTime + .01);
    const el = $(`[data-p="${i}"]`); el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 120);
  };
  $('#pads').addEventListener('pointerdown', e => { const b = e.target.closest('.pad'); if (b) hit(+b.dataset.p); });
  addEventListener('keydown', e => {
    if (e.target.matches('input,textarea') || viewer.classList.contains('open')) return;
    const i = padDefs.findIndex(p => p[1] === e.key.toLowerCase()); if (i >= 0) hit(i);
  });

  /* ---------- garage ---------- */
  const cars = [
    { img: PICS.vette, alt: 'Black sports coupe with gold brake calipers', specs: [['Engine', '6.2L supercharged V8'], ['0–100', '3.0 s'], ['Calipers', 'Gold, obviously'], ['Mood', 'Midnight run']], max: 7200, hz: 60 },
    { img: PICS.cash, alt: 'Maroon sedan with chrome rims, guy fanning cash', specs: [['Engine', '4.6L V8, old school'], ['0–100', 'eventually'], ['Rims', 'Chrome, polished daily'], ['Mood', 'Go crazy']], max: 5200, hz: 40 }
  ];
  let car = 0;
  const setCar = i => {
    car = i; const c = cars[i], img = $('#carImg');
    img.style.opacity = 0;
    setTimeout(() => { img.src = c.img; img.alt = c.alt; img.style.opacity = 1; }, 250);
    $('#carSpecs').innerHTML = c.specs.map(s => `<li><span>${s[0]}</span><b>${s[1]}</b></li>`).join('');
    $$('.tab').forEach((t, j) => t.classList.toggle('on', j === i));
  };
  $('#carTabs').addEventListener('click', e => { const t = e.target.closest('.tab'); if (t) setCar(+t.dataset.car); });
  setCar(0);
  let rpm = 800, revving = false, eng, engGain;
  const engineOn = () => {
    initAudio(); ctx.resume();
    if (!eng) {
      eng = ctx.createOscillator(); eng.type = 'sawtooth';
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
      engGain = ctx.createGain(); engGain.gain.value = 0;
      eng.connect(f); f.connect(engGain); engGain.connect(master); eng.start();
    }
  };
  const revBtn = $('#rev'), carEl = $('#car');
  revBtn.addEventListener('pointerdown', e => { e.preventDefault(); engineOn(); revving = true; carEl.classList.add('shake'); });
  const up = () => { revving = false; carEl.classList.remove('shake'); };
  addEventListener('pointerup', up); revBtn.addEventListener('pointerleave', up);
  setInterval(() => {
    const max = cars[car].max;
    rpm += revving ? (max - rpm) * .12 : (800 - rpm) * .08;
    $('#rpm').textContent = Math.round(rpm / 10) * 10;
    $('#needle').style.transform = `rotate(${135 + (rpm / 8000) * 270}deg)`;
    if (eng) {
      eng.frequency.setTargetAtTime(cars[car].hz * .5 + rpm / 60, ctx.currentTime, .05);
      engGain.gain.setTargetAtTime(revving || rpm > 900 ? .18 : 0, ctx.currentTime, .1);
    }
  }, 40);

  /* ---------- gym ---------- */
  const now = new Date(), wk = Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 864e5 + 1) / 7);
  $('#week').textContent = wk;
  const routine = [['Pull-ups', '4 × max'], ['Incline DB press', '4 × 8–10'], ['Lateral raises', '4 × 15'], ['Rows', '3 × 10'], ['Hanging leg raises', '3 × 12'], ['Side profile check', '1 pic'], ['Sketch 30 min', 'no phone'], ['Water 3L', '—']];
  const todayKey = 'gym:' + now.toDateString();
  let done = store.get(todayKey, []);
  const gymMsgs = ['get up.', 'warm-up done. keep going.', 'halfway. no excuses.', 'almost there.', 'built different. ✌'];
  const renderGym = () => {
    $('#checks').innerHTML = routine.map((r, i) => `<li class="${done.includes(i) ? 'done' : ''}" data-i="${i}"><span class="box">${done.includes(i) ? '✓' : ''}</span><span class="what">${r[0]}</span><span class="sets">${r[1]}</span></li>`).join('');
    $('#doneCount').textContent = done.length; $('#totalCount').textContent = routine.length;
    $('#gymMsg').textContent = gymMsgs[Math.min(4, Math.floor(done.length / routine.length * 4.01))];
    store.set(todayKey, done);
  };
  $('#checks').addEventListener('click', e => {
    const li = e.target.closest('li'); if (!li) return;
    const i = +li.dataset.i; done = done.includes(i) ? done.filter(x => x !== i) : [...done, i]; renderGym();
    if (done.length === routine.length) { bigWord('DONE'); rain(['💪', '🔥'], 24); }
  });
  $('#resetGym').onclick = () => { done = []; renderGym(); };
  renderGym();

  /* ---------- scramble headings + reveal ---------- */
  const glyphs = '!<>-_\\/[]{}—=+*^?#ABCDEFXYZ7';
  const scramble = el => {
    const final = el.textContent; let f = 0;
    const id = setInterval(() => {
      el.textContent = final.split('').map((ch, i) => ch === ' ' ? ' ' : i < f / 2 ? ch : glyphs[Math.floor(Math.random() * glyphs.length)]).join('');
      if (++f > final.length * 2) { clearInterval(id); el.textContent = final; }
    }, 35);
  };
  $$('.fit, .pcard, .seven-copy, .panel, .flash, .sketch-copy, .garage-wrap, .player, .tracklist, .gym-wrap, .rings').forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    if (e.target.classList.contains('scramble')) scramble(e.target);
    io.unobserve(e.target);
  }), { threshold: .12 });
  $$('.reveal, .scramble').forEach(el => io.observe(el));
})();
