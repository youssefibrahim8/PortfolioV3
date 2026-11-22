(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const f1 = n => (+n).toFixed(1);
  const NS = 'http://www.w3.org/2000/svg';
  const pl = a => a.map(p => `${f1(p[0])},${f1(p[1])}`).join(' ');

  function rng(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  /* ==========================================================
     THE CITY — hotspots on the painting (1672 x 941 pixels)
     ========================================================== */
  const W = 1671, H = 941;
  const POIS = {
    projects: {
      label: 'PROJECTS', sign: { t: 'h', x: 646, y: 236 },
      poly: [[635, 32], [650, 55], [660, 75], [668, 100], [682, 130], [690, 180], [705, 215], [714, 240], [714, 535], [578, 535], [578, 240], [586, 215], [596, 180], [600, 130], [608, 100], [614, 75], [622, 55]],
      light: { tx: 650, bx: 646, by: 540, bw: 82 }, zoom: [646, 300],
    },
    skills: {
      label: 'SKILLS', sign: { t: 'h', x: 1165, y: 360 },
      poly: [[1010, 455], [1100, 450], [1100, 410], [1130, 385], [1165, 372], [1200, 385], [1230, 410], [1250, 425], [1385, 420], [1420, 445], [1470, 470], [1480, 620], [1300, 660], [1250, 690], [1010, 690]],
      light: { tx: 1250, bx: 1245, by: 695, bw: 250 }, zoom: [1165, 615],
    },
    profile: {
      label: 'PROFILE', sign: { t: 'h', x: 130, y: 438 },
      poly: [[40, 470], [110, 450], [180, 440], [195, 415], [250, 408], [262, 395], [350, 395], [372, 415], [420, 420], [460, 445], [485, 470], [485, 690], [40, 690]],
      light: { tx: 270, bx: 262, by: 695, bw: 240 }, zoom: [295, 615],
    },
    hobbies: {
      label: 'HOBBIES', sign: { t: 'h', x: 618, y: 762 },
      poly: [[488, 548], [545, 532], [740, 535], [748, 545], [745, 690], [690, 700], [620, 722], [560, 712], [505, 700], [490, 650]],
      light: { tx: 625, bx: 618, by: 725, bw: 150 }, zoom: [618, 640],
    },
    contact: {
      label: 'CONTACT', sign: { t: 'h', x: 922, y: 632 }, small: true,
      poly: [[882, 660], [890, 648], [906, 642], [922, 648], [930, 660], [930, 725], [882, 725]],
      hit: [[868, 636], [946, 636], [946, 742], [868, 742]],
      light: { tx: 912, bx: 906, by: 730, bw: 46 }, zoom: [906, 690],
    },
  };
  const LIGHT_TOP = -320; // the lamp hangs above the frame

  function signSVG(name, poi) {
    const { t, x, y } = poi.sign, txt = poi.label;
    let s = `<g class="sign" data-room="${name}">`;
    if (t === 'v') {
      const w = 26, h = txt.length * 20 + 16, X = x - w / 2;
      s += `<rect class="sign-plate" x="${f1(X)}" y="${y}" width="${w}" height="${h}" rx="3"/>`;
      s += `<rect class="sign-edge" x="${f1(X + 4)}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="2"/>`;
      txt.split('').forEach((ch, i) => { s += `<text class="sign-txt" x="${f1(x)}" y="${f1(y + 26 + i * 20)}">${ch}</text>`; });
    } else {
      const w = txt.length * 14 + 30, h = 28, X = x - w / 2, Y = y - h;
      s += `<rect class="sign-plate" x="${f1(X)}" y="${f1(Y)}" width="${f1(w)}" height="${h}" rx="3"/>`;
      s += `<rect class="sign-edge" x="${f1(X + 4)}" y="${f1(Y + 4)}" width="${f1(w - 8)}" height="${h - 8}" rx="2"/>`;
      s += `<text class="sign-txt h" x="${f1(x)}" y="${f1(Y + 19.5)}">${txt}</text>`;
    }
    return s + `</g>`;
  }

  const world = $('#world');
  (function buildCity() {
    let s = `<defs>
    </defs>`;
    let pois = '', signs = '';
    for (const [name, p] of Object.entries(POIS)) {
      const L = p.light;
      let inner = '';
      // one lamp, hung above the frame: a clean cone of light, bright at the top,
      // fading out as it reaches the ground (like a street lamp)
      const tw = L.bw * 0.16, id = `gl-${name}`;
      inner += `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${L.tx}" y1="${LIGHT_TOP}" x2="${L.bx}" y2="${L.by}">
        <stop offset="0" stop-color="#fff4d6" stop-opacity=".8"/><stop offset=".45" stop-color="#ffe9bc" stop-opacity=".5"/>
        <stop offset=".8" stop-color="#ffd98a" stop-opacity=".22"/><stop offset="1" stop-color="#ffd98a" stop-opacity=".04"/></linearGradient>`;
      inner += `<polygon class="cone" style="transform-origin:${L.tx}px ${LIGHT_TOP}px" points="${L.tx - tw},${LIGHT_TOP} ${L.tx + tw},${LIGHT_TOP} ${L.bx + L.bw},${L.by} ${L.bx - L.bw},${L.by}" fill="url(#${id})"/>`;
      inner += `<polygon class="hit" points="${pl(p.hit || p.poly)}" fill="transparent"/>`;
      inner += `<circle class="zt" cx="${p.zoom[0]}" cy="${p.zoom[1]}" r="1" fill="transparent"/>`;
      const label = { projects: 'Projects', skills: 'Skills', profile: 'Profile', hobbies: 'Hobbies (museum)', contact: 'Contact (phone booth)' }[name];
      pois += `<g class="poi${p.small ? ' small' : ''}" data-room="${name}" tabindex="0" role="button" aria-label="${label}">${inner}</g>`;
      signs += signSVG(name, p);
    }
    s += `<g class="pois">${pois}</g><g class="signs">${signs}</g>`;
    world.innerHTML = s;
  })();

  /* ---------- the painting covers the screen; on phones you can swipe along it ---------- */
  const cityScroll = $('#cityScroll'), cityScene = $('#cityScene');
  const FOCUS_X = 0.45;
  function fitCity() {
    const vw = innerWidth, vh = innerHeight, ar = W / H;
    let sw = Math.max(vw, vh * ar), sh = sw / ar;
    cityScene.style.width = sw + 'px';
    cityScene.style.height = sh + 'px';
    cityScene.style.marginTop = Math.min(0, (vh - sh) * 0.55) + 'px';
    const pannable = sw > vw + 2;
    document.body.classList.toggle('pannable', pannable);
    if (pannable) cityScroll.scrollLeft = Math.max(0, Math.min(sw - vw, sw * FOCUS_X - vw / 2));
  }
  fitCity();
  addEventListener('resize', fitCity);

  /* ---------- light rain over the city ---------- */
  const rainCanvas = $('#rain'), rc = rainCanvas.getContext('2d');
  let drops = [], rainW = 0, rainH = 0, dpr = 1;
  const WIND = 0.16; // gentle slant
  function newDrop(anywhere) {
    return {
      x: Math.random() * (rainW + rainH * WIND) - rainH * WIND,
      y: anywhere ? Math.random() * rainH : -20 - Math.random() * rainH * 0.3,
      len: 9 + Math.random() * 14,
      v: 520 + Math.random() * 380,
      a: 0.12 + Math.random() * 0.22,
    };
  }
  function sizeRain() {
    dpr = Math.min(2, devicePixelRatio || 1);
    rainW = innerWidth; rainH = innerHeight;
    rainCanvas.width = rainW * dpr; rainCanvas.height = rainH * dpr;
    rc.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(220, (rainW * rainH) / 8500));
    drops = Array.from({ length: count }, () => newDrop(true));
  }
  sizeRain();
  addEventListener('resize', sizeRain);
  let rafId = 0, lastT = 0;
  function rain(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
    lastT = t;
    rc.clearRect(0, 0, rainW, rainH);
    rc.lineWidth = 1;
    rc.lineCap = 'round';
    for (const d of drops) {
      d.y += d.v * dt; d.x += d.v * WIND * dt;
      if (d.y - d.len > rainH) Object.assign(d, newDrop(false));
      rc.strokeStyle = `rgba(205,210,255,${d.a})`;
      rc.beginPath();
      rc.moveTo(d.x, d.y);
      rc.lineTo(d.x - d.len * WIND, d.y - d.len);
      rc.stroke();
    }
    rafId = requestAnimationFrame(rain);
  }
  const startRain = () => { if (!reduce && !rafId) { lastT = performance.now(); rafId = requestAnimationFrame(rain); } };
  const stopRain = () => { cancelAnimationFrame(rafId); rafId = 0; };
  startRain();

  // spotlight + sign light up together
  $$('.poi', world).forEach(g => {
    const sign = $(`.sign[data-room="${g.dataset.room}"]`, world);
    const on = v => { g.classList.toggle('lit', v); sign && sign.classList.toggle('lit', v); };
    const off = () => { if (!g.classList.contains('chosen')) on(false); };
    g.addEventListener('mouseenter', () => on(true));
    g.addEventListener('mouseleave', off);
    g.addEventListener('focus', () => on(true));
    g.addEventListener('blur', off);
    if (sign) {
      sign.addEventListener('mouseenter', () => on(true));
      sign.addEventListener('mouseleave', off);
      sign.addEventListener('click', () => { location.hash = g.dataset.room; });
    }
  });

  const timeEl = $('#time');
  const tick = () => { timeEl.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
  tick(); setInterval(tick, 20000);

  /* ==========================================================
     PROJECTS — slides on the boardroom screen
     ========================================================== */
  const QW = 1000, QH = 577;
  const SCREEN = [[406, 178], [1269, 178], [1269, 676], [406, 676]];
  const BW = 1674; // boardroom painting width
  function solve(A, b) {
    const n = b.length;
    for (let i = 0; i < n; i++) {
      let m = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
      [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
      for (let r = i + 1; r < n; r++) {
        const k = A[r][i] / A[i][i];
        for (let c = i; c < n; c++) A[r][c] -= k * A[i][c];
        b[r] -= k * b[i];
      }
    }
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
    return x;
  }
  function quadMatrix(w, h, dst) {
    const src = [[0, 0], [w, 0], [w, h], [0, h]], A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    const [a, bb, c, d, e, f, g, hh] = solve(A, b);
    return `matrix3d(${a},${d},0,${g},${bb},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
  }
  const quad = $('#slidesQuad');
  function fitSlides() {
    const s = quad.parentElement.clientWidth / BW;
    if (!s) return;
    quad.style.width = QW + 'px';
    quad.style.height = QH + 'px';
    quad.style.transform = quadMatrix(QW, QH, SCREEN.map(([x, y]) => [x * s, y * s]));
  }

  // little deco skyline "photos" for each project slide
  function skyline(o) {
    const r = rng(o.seed);
    let a = '', b = '', win = '';
    let x = -10;
    while (x < o.w + 10) {
      const w = o.minW + r() * (o.maxW - o.minW), h = o.minH + r() * (o.maxH - o.minH), top = o.h - h, sp = x + w * 0.58;
      a += `M${f1(x)} ${o.h}V${f1(top)}H${f1(sp)}V${o.h}Z`;
      b += `M${f1(sp)} ${o.h}V${f1(top)}H${f1(x + w)}V${o.h}Z`;
      if (r() < 0.35) { const sh = 14 + r() * 40; a += `M${f1(x + w * .2)} ${f1(top)}L${f1(x + w / 2)} ${f1(top - sh)}L${f1(x + w * .8)} ${f1(top)}Z`; }
      for (let wy = top + 8; wy < o.h - 6; wy += 9) for (let wx = x + 4; wx < x + w - 4; wx += 7) if (r() < o.lit) win += `M${f1(wx)} ${f1(wy)}h3v4h-3Z`;
      x += w + 2 + r() * 6;
    }
    return `<path d="${a}" fill="${o.cA}"/><path d="${b}" fill="${o.cB}"/><path d="${win}" fill="#f6d488"/>`;
  }
  $$('.slide-proj').forEach((sl, i) => {
    const svg = $('.s-art svg', sl), s = +sl.dataset.seed;
    svg.setAttribute('viewBox', '0 0 400 300');
    svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
    svg.innerHTML = `<defs><linearGradient id="sgSky${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1240"/><stop offset="1" stop-color="#4a3a8a"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#sgSky${i})"/>
      <circle cx="${60 + (s * 37) % 280}" cy="72" r="30" fill="#e6e8ff"/>` +
      skyline({ w: 400, h: 300, seed: s, minW: 22, maxW: 52, minH: 110, maxH: 230, cA: '#221a48', cB: '#2f2660', lit: 0.06 }) +
      skyline({ w: 400, h: 300, seed: s + 9, minW: 30, maxW: 70, minH: 50, maxH: 140, cA: '#0e0a1e', cB: '#171230', lit: 0.12 });
  });

  const slides = $$('.slide'), dotsEl = $('.s-dots'), countEl = $('.s-count');
  let slideI = 0;
  dotsEl.innerHTML = slides.map((_, i) => `<button type="button" aria-label="Slide ${i + 1}"></button>`).join('');
  const dots = $$('button', dotsEl);
  function goSlide(i) {
    slideI = (i + slides.length) % slides.length;
    slides.forEach((s, k) => { s.classList.toggle('on', k === slideI); s.inert = k !== slideI; });
    dots.forEach((d, k) => d.classList.toggle('on', k === slideI));
    countEl.textContent = `${String(slideI + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  }
  $('.s-btn.prev').addEventListener('click', () => goSlide(slideI - 1));
  $('.s-btn.next').addEventListener('click', () => goSlide(slideI + 1));
  dots.forEach((d, k) => d.addEventListener('click', () => goSlide(k)));
  goSlide(0);

  /* ==========================================================
     PROFILE — the case file on the desk
     ========================================================== */
  const modal = $('.file-modal'), fileHot = $('#fileHot');
  function openFile() {
    const r = fileHot.getBoundingClientRect();
    const pop = $('.file-pop', modal);
    modal.hidden = false;
    const pr = pop.getBoundingClientRect();
    pop.style.setProperty('--fx', `${f1(r.left + r.width / 2 - (pr.left + pr.width / 2))}px`);
    pop.style.setProperty('--fy', `${f1(r.top + r.height / 2 - (pr.top + pr.height / 2))}px`);
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('show')));
    $('.room-profile').classList.add('file-out');
    setTimeout(() => $('.file-close').focus(), 60);
  }
  function closeFile() {
    modal.classList.remove('show');
    $('.room-profile').classList.remove('file-out');
    setTimeout(() => { modal.hidden = true; }, 500);
  }
  fileHot.addEventListener('click', openFile);
  fileHot.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFile(); } });
  $('.file-close').addEventListener('click', closeFile);
  modal.addEventListener('click', e => { if (e.target === modal) closeFile(); });

  /* ==========================================================
     SKILLS — take one of the three books, it opens on the left
     ========================================================== */
  const SKILLS = [
    { name: 'Skill One', section: 'Languages', level: 4, note: 'Placeholder: what you have built with this, and how comfortable you are with it.' },
    { name: 'Skill Two', section: 'Frameworks & Tools', level: 3, note: 'Placeholder: what you have built with this, and how comfortable you are with it.' },
    { name: 'Skill Three', section: 'Concepts', level: 4, note: 'Placeholder: a course or project where you used this.' },
  ];
  const LW = 1855, LH = 848; // library and museum paintings
  const skillsRoom = $('.room-skills'), tome = $('#tome'), tip = $('.book-tip');
  const bookPolys = $$('.book-hot');
  let openBook = -1;
  const polyBox = (p, sw, sh) => {
    const pts = p.getAttribute('points').trim().split(/\s+/).map(s => s.split(',').map(Number));
    const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  };
  bookPolys.forEach(p => {
    const i = +p.dataset.i, b = polyBox(p);
    p.setAttribute('aria-label', SKILLS[i].name);
    const show = () => {
      tip.textContent = SKILLS[i].name;
      tip.style.left = `${((b.x0 + b.x1) / 2 / LW) * 100}%`;
      tip.style.top = `${(b.y0 / LH) * 100}%`;
      tip.classList.add('on');
    };
    p.addEventListener('mouseenter', show);
    p.addEventListener('focus', show);
    p.addEventListener('mouseleave', () => tip.classList.remove('on'));
    p.addEventListener('blur', () => tip.classList.remove('on'));
    p.addEventListener('click', () => takeBook(i));
    p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); takeBook(i); } });
  });
  function takeBook(i) {
    if (openBook === i) return;
    const sk = SKILLS[i];
    const swap = openBook >= 0;
    const doIt = () => {
      openBook = i;
      bookPolys.forEach((p, k) => p.classList.toggle('taken', k === i));
      tome.dataset.book = i;
      $('.cover-title', tome).textContent = sk.name;
      $('.t-section', tome).textContent = sk.section;
      $('.t-title', tome).textContent = sk.name;
      $('.t-level', tome).innerHTML = Array.from({ length: 5 }, (_, k) => `<i class="${k < sk.level ? 'f' : ''}"></i>`).join('');
      $('.t-note', tome).textContent = sk.note;
      const scene = tome.parentElement, s = scene.clientWidth / LW;
      const b = polyBox(bookPolys[i]);
      const tr = tome.getBoundingClientRect(), sr = scene.getBoundingClientRect();
      const coverCx = tr.left - sr.left + tr.width * 0.75, coverCy = tr.top - sr.top + tr.height / 2;
      tome.style.setProperty('--from-x', `${f1((b.x0 + b.x1) / 2 * s - coverCx)}px`);
      tome.style.setProperty('--from-y', `${f1((b.y0 + b.y1) / 2 * s - coverCy)}px`);
      tome.classList.remove('open', 'shown');
      tome.classList.add('flying');
      void tome.offsetWidth;
      tome.classList.add('shown');
      skillsRoom.classList.add('reading');
      skillsRoom.style.setProperty('--fx', '.34');
      setTimeout(() => tome.classList.add('open'), reduce ? 0 : 750);
    };
    if (swap) { closeBook(true); setTimeout(doIt, 500); } else doIt();
  }
  function closeBook(quick) {
    tome.classList.remove('open');
    setTimeout(() => {
      tome.classList.remove('shown');
      if (!quick) { skillsRoom.classList.remove('reading'); skillsRoom.style.setProperty('--fx', '.76'); }
      bookPolys.forEach(p => p.classList.remove('taken'));
      openBook = -1;
    }, quick ? 250 : 500);
  }
  $('.tome-close').addEventListener('click', () => closeBook(false));

  /* ==========================================================
     HOBBIES — the wall text and the four glass cases
     ========================================================== */
  const HOBBIES = [
    { name: 'Hobby One', item: 'The Amphora', desc: 'Placeholder: what this hobby is, when you got into it, and why it matters to you.' },
    { name: 'Hobby Two', item: 'The Medal', desc: 'Placeholder: what this hobby is, when you got into it, and why it matters to you.' },
    { name: 'Hobby Three', item: 'The Cup', desc: 'Placeholder: what this hobby is, when you got into it, and why it matters to you.' },
    { name: 'Hobby Four', item: 'The Clock', desc: 'Placeholder: what this hobby is, when you got into it, and why it matters to you.' },
  ];
  const ROMAN = ['I', 'II', 'III', 'IV'];
  const wall = $('.wall-text'), cases = $$('.case-hot'), exhibits = $$('.exhibit'), wtDots = $('.wt-dots'), caseTip = $('.case-tip');
  wtDots.innerHTML = HOBBIES.map((h, i) => `<button type="button" aria-label="Exhibit ${ROMAN[i]}: ${h.name}"></button>`).join('');
  let hobbyI = 0;
  function goHobby(i, instant) {
    hobbyI = (i + HOBBIES.length) % HOBBIES.length;
    const h = HOBBIES[hobbyI];
    const fill = () => {
      $('.wt-kicker', wall).textContent = `Exhibit ${ROMAN[hobbyI]} of IV`;
      $('.wt-title', wall).textContent = h.name;
      $('.wt-desc', wall).textContent = h.desc;
      $('.wt-credit', wall).textContent = `On display: ${h.item} · Gift of Y. Ibrahim`;
      wall.classList.remove('fade');
    };
    if (instant) fill(); else { wall.classList.add('fade'); setTimeout(fill, 320); }
    cases.forEach((c, k) => c.classList.toggle('on', k === hobbyI));
    exhibits.forEach((c, k) => c.classList.toggle('on', k === hobbyI));
    $$('button', wtDots).forEach((d, k) => d.classList.toggle('on', k === hobbyI));
  }
  cases.forEach(c => {
    const i = +c.dataset.i, b = polyBox(c);
    c.setAttribute('aria-label', `Exhibit ${ROMAN[i]}: ${HOBBIES[i].name}`);
    c.addEventListener('click', () => goHobby(i));
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHobby(i); } });
    c.addEventListener('mouseenter', () => {
      caseTip.textContent = `${ROMAN[i]} · ${HOBBIES[i].name}`;
      caseTip.style.left = `${((b.x0 + b.x1) / 2 / LW) * 100}%`;
      caseTip.style.top = `${(b.y0 / LH) * 100}%`;
      caseTip.classList.add('on');
    });
    c.addEventListener('mouseleave', () => caseTip.classList.remove('on'));
  });
  $('.wt-btn.prev').addEventListener('click', () => goHobby(hobbyI - 1));
  $('.wt-btn.next').addEventListener('click', () => goHobby(hobbyI + 1));
  $$('button', wtDots).forEach((d, k) => d.addEventListener('click', () => goHobby(k)));
  goHobby(0, true);

  /* ==========================================================
     CONTACT — the booth buttons
     ========================================================== */
  const lcd = $('#lcd'), contactRoom = $('.room-contact');
  const IDLE = 'INSERT 10¢';
  let lcdTimer;
  const setLcd = (txt, hold) => {
    clearTimeout(lcdTimer);
    lcd.textContent = txt;
    if (hold) lcdTimer = setTimeout(() => { lcd.textContent = IDLE; contactRoom.classList.remove('ringing'); }, hold);
  };
  const lcdIdle = () => { if (!contactRoom.classList.contains('ringing')) setLcd(IDLE); };
  $$('.dp-btn').forEach(a => {
    a.addEventListener('mouseenter', () => setLcd(`DIAL ${a.dataset.who}`));
    a.addEventListener('mouseleave', lcdIdle);
    a.addEventListener('click', () => { contactRoom.classList.add('ringing'); setLcd(`CALLING ${a.dataset.who}…`, 2400); });
  });

  /* ---------- pick up the phone: leave a message that lands in Youssef's inbox ---------- */
  const MAIL_TO = 'yimgi09@gmail.com';
  const MAIL_ENDPOINT = `https://formsubmit.co/ajax/${MAIL_TO}`;
  const phoneHot = $('#phoneHot'), msgModal = $('.msg-modal'), msgForm = $('#msgForm');
  const msgStatus = $('.tg-status', msgForm), sendBtn = $('.tg-send', msgForm), sendLabel = $('span', sendBtn);
  function openMsg() {
    const r = phoneHot.getBoundingClientRect();
    const pop = $('.msg-pop', msgModal);
    msgModal.hidden = false;
    const pr = pop.getBoundingClientRect();
    pop.style.setProperty('--fx', `${f1(r.left + r.width / 2 - (pr.left + pr.width / 2))}px`);
    pop.style.setProperty('--fy', `${f1(r.top + r.height / 2 - (pr.top + pr.height / 2))}px`);
    requestAnimationFrame(() => requestAnimationFrame(() => msgModal.classList.add('show')));
    contactRoom.classList.add('off-hook');
    setLcd('LINE OPEN');
    setTimeout(() => msgForm.elements.name.focus({ preventScroll: true }), 120);
  }
  function closeMsg() {
    msgModal.classList.remove('show');
    contactRoom.classList.remove('off-hook');
    lcdIdle();
    setTimeout(() => { msgModal.hidden = true; }, 450);
  }
  phoneHot.addEventListener('click', openMsg);
  phoneHot.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMsg(); } });
  phoneHot.addEventListener('mouseenter', () => { if (msgModal.hidden) setLcd('PICK UP'); });
  phoneHot.addEventListener('mouseleave', () => { if (msgModal.hidden) lcdIdle(); });
  $('.msg-close').addEventListener('click', closeMsg);
  msgModal.addEventListener('click', e => { if (e.target === msgModal) closeMsg(); });

  const setStatus = (txt, kind) => { msgStatus.textContent = txt; msgStatus.dataset.kind = kind || ''; };
  msgForm.addEventListener('submit', async e => {
    e.preventDefault();
    const f = msgForm.elements;
    const name = f.name.value.trim(), email = f.email.value.trim(), message = f.message.value.trim();
    if (!name || !message) return setStatus('Add your name and a message first.', 'err');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setStatus('That email address doesn’t look right.', 'err');
    if (f._honey.value) return; // bots fill the hidden field
    sendBtn.disabled = true;
    sendLabel.textContent = 'Sending…';
    setStatus('Connecting your call…');
    setLcd('SENDING…');
    try {
      const res = await fetch(MAIL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name, email, message,
          _replyto: email,
          _subject: `Portfolio message from ${name}`,
          _template: 'box',
          _captcha: 'false',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || String(data.success) !== 'true') throw new Error(data.message || `HTTP ${res.status}`);
      msgForm.reset();
      setStatus('Message sent. I’ll get back to you soon.', 'ok');
      sendLabel.textContent = 'Sent ✓';
      contactRoom.classList.add('ringing');
      setLcd('MESSAGE SENT', 3000);
      setTimeout(() => { sendLabel.textContent = 'Send message'; sendBtn.disabled = false; }, 3000);
    } catch (err) {
      sendBtn.disabled = false;
      sendLabel.textContent = 'Try again';
      setLcd('NO ANSWER', 2400);
      const mailto = `mailto:${MAIL_TO}?subject=${encodeURIComponent(`Portfolio message from ${name}`)}&body=${encodeURIComponent(message + '\n\n— ' + name + ' (' + email + ')')}`;
      msgStatus.dataset.kind = 'err';
      msgStatus.textContent = 'The line dropped. ';
      const a = document.createElement('a');
      a.href = mailto;
      a.textContent = 'Send it from your email app instead';
      msgStatus.append(a, '.');
    }
  });

  const copyBtn = $('.tg-copy');
  let copyTimer;
  copyBtn.addEventListener('click', async () => {
    clearTimeout(copyTimer);
    const email = copyBtn.dataset.email;
    let ok = false;
    try { await navigator.clipboard.writeText(email); ok = true; } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = email; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      ta.parentNode.removeChild(ta);
    }
    copyBtn.textContent = ok ? 'Copied!' : email;
    copyTimer = setTimeout(() => { copyBtn.textContent = 'Copy my address'; }, 2400);
  });

  /* ==========================================================
     NAVIGATION — zoom from the balcony into a room
     ========================================================== */
  const ROOMS = ['profile', 'projects', 'skills', 'hobbies', 'contact'];
  const LABELS = { profile: 'Profile', projects: 'Projects', skills: 'Skills', hobbies: 'Hobbies', contact: 'Contact' };
  const city = $('#city'), flash = $('.flash');
  const rooms = Object.fromEntries($$('.room').map(r => [r.dataset.room, r]));
  let current = null, timers = [];

  $$('.elevator').forEach(nav => {
    nav.innerHTML = ROOMS.map((r, i) => `<a href="#${r}" data-room="${r}" title="${LABELS[r]}" aria-label="${LABELS[r]}">${i + 1}</a>`).join('');
  });
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  /* ---------- rain outside every room window ----------
     Window glass outlined in each painting's own pixels. Streaks fall
     behind the glass, and a few drops slide slowly down the panes. */
  const ROOM_WINDOWS = {
    projects: { w: 1674, h: 940, polys: [
      [[18, 0], [198, 0], [198, 545], [110, 552], [85, 580], [85, 650], [45, 650], [40, 520], [18, 515]],
      [[1482, 0], [1674, 0], [1674, 505], [1600, 510], [1530, 525], [1525, 650], [1482, 650]]] },
    profile: { w: 1670, h: 941, polys: [
      [[1195, 48], [1585, 48], [1585, 550], [1195, 550]]] },
    skills: { w: 1855, h: 848, polys: [
      [[522, 650], [522, 200], [535, 150], [565, 110], [610, 82], [660, 68], [700, 65], [745, 68], [795, 82], [840, 110], [870, 150], [885, 200],
       [885, 650], [800, 650], [795, 595], [765, 590], [762, 545], [740, 535], [718, 545], [712, 592], [700, 600], [700, 650], [610, 650],
       [605, 640], [540, 640], [535, 650]]] },
    hobbies: { w: 1855, h: 848, polys: [
      [[100, 585], [100, 120], [110, 85], [140, 60], [185, 50], [230, 60], [258, 85], [270, 120], [270, 462], [178, 462], [178, 585]],
      [[1585, 462], [1585, 120], [1597, 85], [1625, 60], [1672, 50], [1718, 60], [1748, 85], [1760, 120], [1760, 585], [1680, 585], [1680, 462]]] },
    contact: { w: 1672, h: 941, polys: [
      [[72, 0], [445, 30], [445, 870], [72, 900]],
      [[1235, 30], [1625, 0], [1625, 900], [1235, 870]]] },
  };
  const roomRain = {};
  Object.entries(ROOM_WINDOWS).forEach(([name, cfg]) => {
    const scene = $('.scene', rooms[name]);
    const cv = document.createElement('canvas');
    cv.className = 'room-rain';
    cv.setAttribute('aria-hidden', 'true');
    scene.insertBefore(cv, $('.scene-img', scene).nextSibling);
    const ctx = cv.getContext('2d');
    const clip = new Path2D();
    cfg.polys.forEach(p => { clip.moveTo(p[0][0], p[0][1]); p.slice(1).forEach(q => clip.lineTo(q[0], q[1])); clip.closePath(); });
    const boxes = cfg.polys.map(p => {
      const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
      return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    });
    const area = boxes.reduce((s, b) => s + (b.x1 - b.x0) * (b.y1 - b.y0), 0);
    const pick = () => boxes[Math.floor(Math.random() * boxes.length)];
    const streak = (b, anywhere) => ({
      b, x: b.x0 - 40 + Math.random() * (b.x1 - b.x0 + 40),
      y: anywhere ? b.y0 + Math.random() * (b.y1 - b.y0) : b.y0 - 30 - Math.random() * 60,
      len: 14 + Math.random() * 18, v: 650 + Math.random() * 350, a: 0.16 + Math.random() * 0.2,
    });
    const bead = (b, anywhere) => ({
      b, x: b.x0 + Math.random() * (b.x1 - b.x0),
      y: anywhere ? b.y0 + Math.random() * (b.y1 - b.y0) : b.y0 + Math.random() * 20,
      r: 1.4 + Math.random() * 1.8, v: 8 + Math.random() * 40, a: 0.22 + Math.random() * 0.25, pause: Math.random() * 3,
    });
    const streaks = Array.from({ length: Math.round(area / 1500) }, () => streak(pick(), true));
    const beads = Array.from({ length: Math.round(area / 9000) }, () => bead(pick(), true));
    let scale = 1, dpr = 1, raf = 0, last = 0;
    function size() {
      const r = scene.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(2, devicePixelRatio || 1);
      scale = r.width / cfg.w;
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    }
    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000 || 0);
      last = t;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      ctx.save();
      ctx.clip(clip);
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.35 / scale;
      for (const d of streaks) {
        d.y += d.v * dt; d.x += d.v * 0.14 * dt;
        if (d.y - d.len > d.b.y1) Object.assign(d, streak(pick(), false));
        ctx.strokeStyle = `rgba(206,210,255,${d.a})`;
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * 0.14, d.y - d.len); ctx.stroke();
      }
      // droplets clinging to the glass, sliding down in fits and starts
      for (const d of beads) {
        if (d.pause > 0) d.pause -= dt; else { d.y += d.v * dt; if (Math.random() < 0.01) d.pause = 0.4 + Math.random() * 1.5; }
        if (d.y > d.b.y1 + 4) Object.assign(d, bead(pick(), false));
        ctx.fillStyle = `rgba(220,224,255,${d.a * 0.35})`;
        ctx.fillRect(d.x - d.r * 0.35, d.y - d.r * 6, d.r * 0.7, d.r * 6);
        ctx.fillStyle = `rgba(230,232,255,${d.a})`;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      raf = requestAnimationFrame(frame);
    }
    roomRain[name] = {
      start() { size(); if (!raf && !reduce) { last = performance.now(); raf = requestAnimationFrame(frame); } },
      stop() { cancelAnimationFrame(raf); raf = 0; },
      size,
    };
  });
  const runRoomRain = name => Object.entries(roomRain).forEach(([k, r]) => (k === name ? r.start() : r.stop()));
  addEventListener('resize', () => { if (current && roomRain[current]) roomRain[current].size(); });

  /* ---------- Q / E to move between rooms ---------- */
  const controls = $('#controls'), ctlWhere = $('#ctlWhere');
  const neighbour = (name, step) => ROOMS[(ROOMS.indexOf(name) + step + ROOMS.length) % ROOMS.length];
  function switchRoom(step) {
    if (!current) return;
    const keyEl = $(`.key[data-act="${step < 0 ? 'prev' : 'next'}"]`, controls);
    keyEl.classList.remove('press'); void keyEl.offsetWidth; keyEl.classList.add('press');
    location.hash = neighbour(current, step);
  }
  function updateControls(name) {
    controls.classList.toggle('show', !!name);
    if (name) ctlWhere.textContent = `${LABELS[neighbour(name, -1)]} · ${LABELS[neighbour(name, 1)]}`;
  }
  $$('.key', controls).forEach(k => k.addEventListener('click', () => {
    const act = k.dataset.act;
    if (act === 'back') { k.classList.remove('press'); void k.offsetWidth; k.classList.add('press'); location.hash = ''; }
    else switchRoom(act === 'prev' ? -1 : 1);
  }));

  function showRoom(name) {
    runRoomRain(name);
    updateControls(name);
    if (name !== 'skills' && openBook >= 0) closeBook(false);
    Object.entries(rooms).forEach(([k, el]) => { const on = k === name; el.classList.toggle('open', on); el.inert = !on; });
    $$('.elevator a').forEach(a => a.classList.toggle('on', a.dataset.room === name));
    document.title = `${LABELS[name]} — Youssef Ibrahim`;
    if (name === 'projects') requestAnimationFrame(fitSlides);
    if (name !== 'profile' && !modal.hidden) closeFile();
    if (name !== 'contact' && !msgModal.hidden) closeMsg();
    later(() => $('.back', rooms[name]).focus({ preventScroll: true }), 60);
  }

  function enter(name, instant) {
    clearTimers();
    const g = $(`.poi[data-room="${name}"]`, world);
    g.classList.add('lit', 'chosen');
    $(`.sign[data-room="${name}"]`, world)?.classList.add('lit');
    const r = $('.zt', g).getBoundingClientRect();
    city.style.transformOrigin = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`;
    city.inert = true;
    if (instant || reduce) {
      city.classList.add('no-anim', 'zoom', 'away');
      stopRain();
      showRoom(name);
      return;
    }
    city.classList.remove('no-anim');
    later(() => city.classList.add('zoom'), 450);
    later(() => flash.classList.add('on'), 950);
    later(() => showRoom(name), 1500);
    later(() => { flash.classList.remove('on'); city.classList.add('away'); stopRain(); }, 2200);
  }

  function exit() {
    clearTimers();
    const room = rooms[current];
    $$('.poi.lit, .sign.lit', world).forEach(el => el.classList.remove('lit', 'chosen'));
    startRain();
    later(() => runRoomRain(null), 700);
    if (reduce) {
      room.classList.remove('open'); room.inert = true;
      city.classList.remove('zoom', 'away');
    } else {
      flash.classList.add('on');
      city.classList.add('no-anim');
      city.classList.remove('away');
      room.classList.remove('open'); room.inert = true;
      later(() => { city.classList.remove('no-anim', 'zoom'); flash.classList.remove('on'); }, 550);
    }
    city.inert = false;
    document.title = 'Youssef Ibrahim — Portfolio';
    updateControls(null);
    const g = $(`.poi[data-room="${current}"]`, world);
    later(() => g && g.focus({ preventScroll: true }), reduce ? 0 : 1300);
  }

  function route(instant = false) {
    const name = location.hash.slice(1);
    const target = ROOMS.includes(name) ? name : null;
    if (target === current) return;
    if (target && !current) enter(target, instant);
    else if (target && current) { clearTimers(); showRoom(target); }
    else if (!target && current) exit();
    current = target;
  }

  $$('.poi', world).forEach(g => {
    g.addEventListener('click', () => { location.hash = g.dataset.room; });
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.hash = g.dataset.room; } });
  });
  // placeholder links (href="#") must not send you back to the street
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href="#"]');
    if (a && !a.classList.contains('back')) e.preventDefault();
  });
  addEventListener('hashchange', () => route(false));
  addEventListener('resize', () => { if (current === 'projects') fitSlides(); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!modal.hidden) return closeFile();
      if (!msgModal.hidden) return closeMsg();
      if (openBook >= 0) return closeBook(false);
      if (current) {
        const k = $('.key[data-act="back"]', controls);
        k.classList.remove('press'); void k.offsetWidth; k.classList.add('press');
        location.hash = '';
      }
      return;
    }
    // typing in the message form must not move between rooms
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    const key = e.key.toLowerCase();
    if ((key === 'q' || key === 'e') && current && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!modal.hidden) closeFile();
      if (!msgModal.hidden) closeMsg();
      switchRoom(key === 'q' ? -1 : 1);
      return;
    }
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    if (current === 'projects') goSlide(slideI + step);
    if (current === 'hobbies') goHobby(hobbyI + step);
  });

  requestAnimationFrame(() => { route(true); fitSlides(); });
})();
