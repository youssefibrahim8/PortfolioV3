(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const f1 = n => (+n).toFixed(1);
  const NS = 'http://www.w3.org/2000/svg';
  const pl = a => a.map(p => `${f1(p[0])},${f1(p[1])}`).join(' ');

  /* ---------- language: English or French (all text lives in i18n.js) ---------- */
  const DICT = window.I18N || { en: {} };
  const browserLang = () => (/^fr/i.test(navigator.language || '') ? 'fr' : 'en');
  let LANG = 'en';
  try { const saved = localStorage.getItem('lang'); LANG = (saved === 'en' || saved === 'fr') ? saved : browserLang(); }
  catch (e) { LANG = browserLang(); }
  const t = (k, vars) => {
    let v = (DICT[LANG] && k in DICT[LANG]) ? DICT[LANG][k] : (k in DICT.en ? DICT.en[k] : k);
    if (vars && typeof v === 'string') v = v.replace(/\{(\w+)\}/g, (_, n) => (vars[n] ?? ''));
    return v;
  };
  const langHooks = [];
  const onLang = fn => { langHooks.push(fn); };
  function applyLang() {
    document.documentElement.lang = LANG;
    document.documentElement.classList.toggle('lang-fr', LANG === 'fr');
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    // the French versions of the painted card and case file are only fetched when needed
    if (LANG === 'fr') $$('img[data-src]').forEach(img => { if (!img.getAttribute('src')) img.src = img.dataset.src; });
    langHooks.forEach(fn => fn());
  }
  function setLang(l) {
    LANG = l === 'fr' ? 'fr' : 'en';
    try { localStorage.setItem('lang', LANG); } catch (e) { /* storage blocked */ }
    applyLang();
  }

  function rng(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  /* ==========================================================
     THE CITY — hotspots on the painting (1672 x 941 pixels)
     ========================================================== */
  const W = 1672, H = 941;
  const POIS = {
    projects: {
      label: 'PROJECTS', sign: { t: 'v', x: 1050, y: 178 },
      poly: [[975, 45], [990, 120], [1002, 170], [1016, 200], [1022, 455], [938, 455], [944, 200], [958, 170], [964, 120]],
      light: { tx: 1010, bx: 980, by: 460, bw: 78 }, zoom: [980, 330],
    },
    skills: {
      label: 'SKILLS', sign: { t: 'h', x: 1556, y: 206 },
      poly: [[1405, 300], [1495, 262], [1500, 222], [1610, 222], [1672, 250], [1672, 880], [1385, 880], [1385, 640], [1405, 640]],
      light: { tx: 1570, bx: 1530, by: 890, bw: 170 }, zoom: [1515, 420],
    },
    profile: {
      label: 'PROFILE', sign: { t: 'h', x: 1176, y: 486 },
      poly: [[1005, 535], [1100, 495], [1200, 525], [1350, 522], [1350, 760], [1005, 760]],
      light: { tx: 1215, bx: 1178, by: 772, bw: 195 }, zoom: [1105, 728],
    },
    hobbies: {
      label: 'HOBBIES', sign: { t: 'h', x: 652, y: 440 },
      poly: [[495, 520], [560, 450], [760, 450], [810, 520], [810, 690], [495, 690]],
      light: { tx: 690, bx: 652, by: 700, bw: 180 }, zoom: [652, 600],
    },
    contact: {
      label: 'CONTACT', sign: { t: 'h', x: 1343, y: 733 }, small: true,
      poly: [[1322, 745], [1366, 745], [1366, 862], [1322, 862]],
      hit: [[1300, 720], [1390, 720], [1390, 872], [1300, 872]],
      light: { tx: 1370, bx: 1344, by: 872, bw: 52 }, zoom: [1344, 806],
    },
  };

  function signSVG(name, poi) {
    const { t: kind, x, y } = poi.sign, txt = t('sign.' + name);
    let s = `<g class="sign" data-room="${name}">`;
    if (kind === 'v') {
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

  const BEAM_MASKS = ['projects', 'hobbies', 'profile', 'contact'];
  const world = $('#world');
  (function buildCity() {
    let s = `<defs>
    </defs>`;
    let pois = '', signs = '';
    for (const [name, p] of Object.entries(POIS)) {
      const L = p.light;
      let inner = '';
      // two searchlights at street level, one each side, crossing as they sweep up the building
      const top = Math.min(...p.poly.map(q => q[1])) - (p.small ? 18 : 70);
      const spread = L.bw * 0.62, reach = L.bw * (p.small ? 0.5 : 0.3);
      [[-1, 'a'], [1, 'b']].forEach(([side, tag]) => {
        const sx = L.bx + side * spread, sy = L.by;
        const ex = L.bx - side * reach, len = Math.hypot(ex - sx, top - sy);
        const half = Math.max(p.small ? 14 : 26, len * 0.11), id = `gl-${name}-${tag}`;
        inner += `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f1(sx)}" y1="${f1(sy)}" x2="${f1(ex)}" y2="${f1(top)}">
          <stop offset="0" stop-color="#fff6dc" stop-opacity=".85"/><stop offset=".25" stop-color="#ffe9bc" stop-opacity=".5"/>
          <stop offset=".7" stop-color="#ffd98a" stop-opacity=".18"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></linearGradient>`;
        // the beam is drawn along its own axis and then turned, so it can sweep about the lamp
        const ang = Math.atan2(top - sy, ex - sx) * 180 / Math.PI + 90;
        inner += `<g class="beam beam-${tag}" style="transform-origin:${f1(sx)}px ${f1(sy)}px">` +
          `<polygon class="cone" points="${f1(sx - 2.5)},${f1(sy)} ${f1(sx + 2.5)},${f1(sy)} ${f1(sx + half)},${f1(sy - len)} ${f1(sx - half)},${f1(sy - len)}" fill="url(#${id}-v)" transform="rotate(${f1(ang)} ${f1(sx)} ${f1(sy)})"/></g>`;
        inner += `<linearGradient id="${id}-v" gradientUnits="userSpaceOnUse" x1="${f1(sx)}" y1="${f1(sy)}" x2="${f1(sx)}" y2="${f1(sy - len)}">
          <stop offset="0" stop-color="#fff6dc" stop-opacity=".85"/><stop offset=".25" stop-color="#ffe9bc" stop-opacity=".5"/>
          <stop offset=".7" stop-color="#ffd98a" stop-opacity=".18"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></linearGradient>`;
      });
      if (BEAM_MASKS.includes(name)) {
        inner = `<mask id="bm-${name}" maskUnits="userSpaceOnUse" x="-400" y="-600" width="2472" height="1741">` +
          `<image href="assets/beam-mask-${name}.png?v=17" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/></mask>` +
          `<g mask="url(#bm-${name})">${inner}</g>`;
      }
      inner += `<polygon class="hit" points="${pl(p.hit || p.poly)}" fill="transparent"/>`;
      inner += `<circle class="zt" cx="${p.zoom[0]}" cy="${p.zoom[1]}" r="1" fill="transparent"/>`;
      pois += `<g class="poi${p.small ? ' small' : ''}" data-room="${name}" tabindex="0" role="button" aria-label="${t('poi.' + name)}">${inner}</g>`;
    }
    s += `<g class="pois">${pois}</g><g class="signs">${signs}</g>`;
    world.innerHTML = s;
  })();
  // the signs are drawn separately so they can be redrawn in the other language
  function renderSigns() {
    const grp = $('.signs', world);
    grp.innerHTML = Object.entries(POIS).map(([name, p]) => signSVG(name, p)).join('');
    $$('.sign', grp).forEach(sign => {
      const room = sign.dataset.room, g = $(`.poi[data-room="${room}"]`, world);
      if (g && g.classList.contains('lit')) sign.classList.add('lit');
      sign.addEventListener('mouseenter', () => poiLight(room, true));
      sign.addEventListener('mouseleave', () => poiOff(room));
      sign.addEventListener('click', () => { location.hash = room; });
    });
    $$('.poi', world).forEach(g => g.setAttribute('aria-label', t('poi.' + g.dataset.room)));
  }

  /* ---------- the painting covers the screen; on phones you can swipe along it ---------- */
  const cityScroll = $('#cityScroll'), cityScene = $('#cityScene');
  const FOCUS_X = 0.68;
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
  let traffic = null;
  const startRain = () => { traffic && traffic.start(); if (!reduce && !rafId) { lastT = performance.now(); rafId = requestAnimationFrame(rain); } };
  const stopRain = () => { traffic && traffic.stop(); cancelAnimationFrame(rafId); rafId = 0; };
  startRain();

  /* ---------- traffic on the street below the balcony ----------
     A two-lane one-way street (traffic flows toward the viewer).
     Cars keep their lane, hold a safe following distance (Intelligent
     Driver Model), and only pass a slower car after signalling and
     checking the gap in the other lane. All geometry is in the
     painting's own pixels; distances and speeds are in metres. */
  traffic = (() => {
    const cv = $('#traffic'), ctx = cv.getContext('2d');
    // the far curb and the dashed centre line, both measured off the painting
    const CURB = [[560, 712], [760, 745], [800, 752], [900, 770], [1000, 792], [1100, 815], [1200, 838], [1300, 864],
      [1400, 887], [1500, 908], [1600, 928], [1700, 948], [1800, 968]];
    const DASH = [[560, 735], [760, 770], [863, 795], [902, 804], [933, 812], [975, 824], [1021, 837], [1075, 854],
      [1112, 866], [1161, 884], [1188, 893], [1293, 934], [1400, 979], [1500, 1022], [1600, 1065], [1700, 1110], [1800, 1155]];
    const along = (P, x) => {
      if (x <= P[0][0]) return P[0][1];
      for (let i = 1; i < P.length; i++) if (x <= P[i][0]) {
        const [x0, y0] = P[i - 1], [x1, y1] = P[i];
        return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
      }
      return P[P.length - 1][1];
    };
    // pixels per metre grows toward the viewer (from the lamp posts and the phone booth)
    const ppm = x => Math.max(10, 17 + 0.042 * (x - 738));
    // where a car's near-side tyres meet the road. The lane is the band between the curb and the
    // dashes (far lane) or between the dashes and the same width again (near lane); the car's body
    // fills the band above its tyres, so the tyres sit 80% of the way across.
    const laneY = (k, x) => {
      const c = along(CURB, x), d = along(DASH, x), g = d - c;
      return (k === 0 ? c : d) + g * 0.8;
    };
    // metres along the street <-> x, tabulated once
    const X0 = 590, X1 = 1720, M = [0];
    for (let x = X0 + 1; x <= X1; x++) M.push(M[M.length - 1] + 1.05 / ppm(x - 0.5));
    const xAt = m => {
      if (m <= 0) return X0;
      let lo = 0, hi = M.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (M[mid] < m) lo = mid; else hi = mid; }
      return X0 + lo + (m - M[lo]) / ((M[hi] - M[lo]) || 1);
    };
    const END = M[M.length - 1];

    const SPRITES = [1, 2, 3, 4, 5, 6, 7, 8].map(n => {
      const img = new Image();
      img.src = `assets/cars/car${n}.webp?v=13`;
      return img;
    });
    // wheels: [cx, cy, rx, ry, spins?]; lamps: headlights (near side first); contacts = bottom of each wheel
    const CAR_ART = [
      { wheels: [[60, 128, 27, 32, 1], [274, 142, 32, 46, 1]], lamps: [[330, 75, 13], [398, 72, 12]] },
      { wheels: [[42, 118, 18, 30, 0], [220, 140, 32, 48, 1]], lamps: [[285, 85, 13], [360, 85, 12], [305, 122, 7], [378, 122, 6]] },
      { wheels: [[45, 126, 24, 34, 1], [245, 142, 32, 47, 1]], lamps: [[320, 83, 13], [401, 83, 12]] },
      { wheels: [[49, 120, 26, 38, 1], [248, 138, 36, 50, 1]], lamps: [[310, 80, 14], [390, 80, 12], [330, 123, 7], [395, 123, 6]] },
      { wheels: [[60, 130, 27, 38, 1], [231, 143, 32, 46, 1]], lamps: [[293, 85, 12], [367, 82, 11]] },
      { wheels: [[47, 124, 25, 35, 0], [235, 140, 33, 48, 1]], lamps: [[295, 92, 13], [382, 90, 12], [318, 132, 6], [378, 130, 6]] },
      { wheels: [[52, 130, 27, 35, 0], [256, 145, 34, 45, 1]], lamps: [[330, 105, 11], [410, 105, 10]] },
      { wheels: [[55, 132, 28, 33, 0], [254, 142, 34, 47, 1]], lamps: [[328, 70, 14], [415, 70, 13], [360, 120, 7], [435, 120, 6]] },
    ];
    const WHEEL_M = 0.38; // tyre radius in metres, for how fast the wheels turn
    const CAR_H = 1.95, LEN = 5.2, S0 = 1.6, HEADWAY = 1.3, ACC = 0.9, DEC = 1.7; // metres, seconds
    let cars = [], raf = 0, last = 0, clock = 0, scale = 1, dpr = 1;
    let spawnIn = 2;

    function size() {
      const w = cityScene.clientWidth, h = cityScene.clientHeight;
      if (!w) return;
      dpr = Math.min(2, devicePixelRatio || 1);
      scale = w / W;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }

    const occupies = (c, k) => c.lane === k || (c.target === k && c.u > 0);
    function leaderIn(k, m, self) {
      let best = null;
      for (const c of cars) if (c !== self && occupies(c, k) && c.m > m && (!best || c.m < best.m)) best = c;
      return best;
    }
    function followerIn(k, m, self) {
      let best = null;
      for (const c of cars) if (c !== self && occupies(c, k) && c.m <= m && (!best || c.m > best.m)) best = c;
      return best;
    }
    function idm(c, lead) {
      const free = 1 - Math.pow(c.v / c.v0, 4);
      if (!lead) return ACC * free;
      const gap = Math.max(0.1, lead.m - c.m - LEN);
      const want = S0 + c.v * HEADWAY + (c.v * (c.v - lead.v)) / (2 * Math.sqrt(ACC * DEC));
      return ACC * (free - Math.pow(Math.max(0, want) / gap, 2));
    }
    // is it safe to be in lane k at position m? (room ahead, and the car behind won't have to brake hard)
    function safeIn(c, k) {
      const lead = leaderIn(k, c.m, c), back = followerIn(k, c.m, c);
      if (lead && lead.m - c.m - LEN < S0 + c.v * 1.0 + 1) return false;
      if (back) {
        const gap = c.m - back.m - LEN;
        if (gap < S0 + back.v * 1.1 + 1) return false;
      }
      return true;
    }

    function spawn(k) {
      const entering = cars.filter(c => occupies(c, k)).reduce((mn, c) => Math.min(mn, c.m), Infinity);
      if (entering < LEN + S0 + 6) return false; // the last car hasn't cleared the corner yet
      const used = new Set(cars.map(c => c.sprite));
      const free = SPRITES.map((_, i) => i).filter(i => !used.has(i));
      const pool = free.length ? free : SPRITES.map((_, i) => i);
      const slow = Math.random() < 0.3;
      const v0 = slow ? 2.0 + Math.random() * 0.5 : 3.6 + Math.random() * 1.4;
      cars.push({
        sprite: pool[Math.floor(Math.random() * pool.length)],
        lane: k, target: null, u: 0, m: 0, v: Math.min(v0, 3), v0,
        signal: 0, signalT: 0, phase: Math.random() * 6, think: Math.random() * 0.5, spin: Math.random() * 6,
      });
      return true;
    }

    function step(dt) {
      clock += dt;
      // new cars turn the corner from behind the balcony: one or two every fifteen seconds or so
      spawnIn -= dt;
      if (spawnIn <= 0) spawnIn = spawn(Math.random() < 0.72 ? 1 : 0) ? 6 + Math.random() * 8 : 1;
      cars.sort((a, b) => b.m - a.m);
      for (const c of cars) {
        // follow whichever car is ahead in every lane this car occupies
        const ahead = [c.lane, c.target].filter(k => k !== null).map(k => leaderIn(k, c.m, c)).filter(Boolean);
        const lead = ahead.sort((a, b) => a.m - b.m)[0];
        c.acc = Math.max(-4, Math.min(ACC, idm(c, lead)));

        // passing: signal first, check the other lane, then move over smoothly
        c.think -= dt;
        if (c.target === null && c.signal === 0 && c.think <= 0) {
          c.think = 0.5;
          const own = leaderIn(c.lane, c.m, c);
          const other = 1 - c.lane;
          if (own && own.m - c.m - LEN < 20 && own.v0 < c.v0 - 0.35 && c.m > 2 && c.m < END - 14) {
            const otherLead = leaderIn(other, c.m, c);
            const better = !otherLead || otherLead.v > own.v + 0.3 || otherLead.m - c.m > 18;
            if (better && safeIn(c, other)) { c.signal = other === 0 ? -1 : 1; c.signalT = 1.3; c.want = other; }
          }
        }
        if (c.signal !== 0 && c.target === null) {
          c.signalT -= dt;
          if (c.signalT <= 0) {
            if (safeIn(c, c.want)) { c.target = c.want; c.u = 0; }
            else { c.signal = 0; c.think = 1.5; } // gap closed — stay put and try later
          }
        }
        if (c.target !== null) {
          c.u = Math.min(1, c.u + dt / 1.8);
          if (c.u >= 1) { c.lane = c.target; c.target = null; c.u = 0; c.signalT = 0.5; c.offSoon = true; }
        }
        if (c.offSoon) { c.signalT -= dt; if (c.signalT <= 0) { c.signal = 0; c.offSoon = false; } }
      }
      for (const c of cars) {
        c.v = Math.max(0, c.v + c.acc * dt);
        c.m += c.v * dt;
        c.spin += (c.v / WHEEL_M) * dt;
      }
      cars = cars.filter(c => {
        const x = xAt(c.m), y = carY(c, x), h = CAR_H * ppm(x);
        return c.m < END && y - h < H + 6 && x - h * 2.6 < W + 10;
      });
    }
    const ease = t => t * t * (3 - 2 * t);
    const carY = (c, x) => {
      const a = laneY(c.lane, x);
      return c.target === null ? a : a + (laneY(c.target, x) - a) * ease(c.u);
    };

    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      const base = [dpr * scale, 0, 0, dpr * scale, 0, 0];
      ctx.setTransform(...base);
      const list = cars.map(c => {
        const img = SPRITES[c.sprite], art = CAR_ART[c.sprite];
        const fx = xAt(c.m), fy = carY(c, fx), h = CAR_H * ppm(fx), k = h / 190;
        const w = img.naturalWidth ? h * img.naturalWidth / img.naturalHeight : h * 2.35;
        const [R, F] = art.wheels;
        const fcx = F[0], fcy = F[1] + F[3], rcx = R[0], rcy = R[1] + R[3]; // tyre contacts in sprite px
        // tilt the car so the rear tyre lands on the road too (the road falls away faster than the drawing)
        const span = (fcx - rcx) * k;
        let rx = fx - span;
        for (let i = 0; i < 2; i++) rx = fx - span * Math.cos(Math.atan2(fy - carY(c, rx), fx - rx));
        const roadAng = Math.atan2(fy - carY(c, rx), fx - rx);
        const artAng = Math.atan2(fcy - rcy, fcx - rcx);
        return { c, img, art, fx, fy, h, w, k, fcx, fcy, rot: roadAng - artAng, roadAng };
      }).sort((a, b) => a.fy - b.fy);
      const toLocal = o => { ctx.setTransform(...base); ctx.translate(o.fx, o.fy); ctx.rotate(o.rot); ctx.scale(o.k, o.k); ctx.translate(-o.fcx, -o.fcy); };

      // headlight pools on the wet road ahead of each car (drawn first so the cars sit on top)
      ctx.globalCompositeOperation = 'lighter';
      for (const o of list) {
        ctx.setTransform(...base);
        ctx.translate(o.fx + o.w * 0.12, o.fy - o.h * 0.02); ctx.rotate(o.roadAng);
        ctx.scale(1, 0.24);
        const r = o.w * 0.75;
        const g = ctx.createRadialGradient(r * 0.55, 0, 0, r * 0.55, 0, r);
        g.addColorStop(0, 'rgba(255,214,140,.26)'); g.addColorStop(0.5, 'rgba(255,200,120,.09)'); g.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(r * 0.55, 0, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      for (const o of list) {
        const { c, img, art, h } = o;
        // contact shadow along the line between the tyres
        ctx.setTransform(...base);
        ctx.translate(o.fx, o.fy); ctx.rotate(o.roadAng);
        ctx.fillStyle = 'rgba(2,2,14,.5)';
        ctx.beginPath(); ctx.ellipse(-o.w * 0.3, -h * 0.01, o.w * 0.48, h * 0.075, 0, 0, Math.PI * 2); ctx.fill();

        toLocal(o);
        const bob = Math.sin(clock * 11 + c.phase) * 0.9; // a gentle suspension bounce, in sprite px
        if (img.complete && img.naturalWidth) ctx.drawImage(img, 0, bob, img.naturalWidth, img.naturalHeight);

        // wheels turning: tread marks on the tyre and spokes on the hub, rotating with the road speed
        for (const [cx, cy, rx, ry, spins] of art.wheels) {
          if (!spins) continue;
          ctx.save();
          ctx.translate(cx, cy + bob * 0.3); ctx.scale(rx, ry);
          ctx.beginPath(); ctx.arc(0, 0, 0.97, 0, Math.PI * 2); ctx.clip();
          ctx.lineCap = 'round';
          for (let i = 0; i < 6; i++) {
            const a = c.spin + i * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a);
            ctx.strokeStyle = 'rgba(8,6,16,.42)'; ctx.lineWidth = 0.07;
            ctx.beginPath(); ctx.moveTo(ca * 0.72, sa * 0.72); ctx.lineTo(ca * 0.93, sa * 0.93); ctx.stroke();
            if (i % 2 === 0) {
              ctx.strokeStyle = 'rgba(255,236,200,.16)'; ctx.lineWidth = 0.05;
              ctx.beginPath(); ctx.moveTo(ca * 0.16, sa * 0.16); ctx.lineTo(ca * 0.5, sa * 0.5); ctx.stroke();
            }
          }
          ctx.restore();
        }

        // headlamps glow exactly where they are painted
        ctx.globalCompositeOperation = 'lighter';
        for (const [lx, ly, lr] of art.lamps) {
          const r = lr * 2.2;
          const g = ctx.createRadialGradient(lx, ly + bob, 0, lx, ly + bob, r);
          g.addColorStop(0, 'rgba(255,230,170,.55)'); g.addColorStop(0.4, 'rgba(255,220,150,.2)'); g.addColorStop(1, 'rgba(255,220,150,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly + bob, r, 0, Math.PI * 2); ctx.fill();
        }
        // turn signal: we see each car's right side, so a move to the near lane (right) blinks the near
        // headlamp and the back corner; a move to the far lane (left) blinks the outer headlamp
        if (c.signal !== 0 && Math.floor(clock * 3.2 + c.phase) % 2 === 0) {
          const [nearL, farL] = art.lamps;
          const spots = c.signal > 0 ? [[nearL[0] - nearL[2] * 1.4, nearL[1] + nearL[2] * 0.8], [8, 100]] : [[farL[0] + farL[2] * 1.3, farL[1] + farL[2] * 0.8]];
          for (const [sx, sy] of spots) {
            const r = 16;
            const g = ctx.createRadialGradient(sx, sy + bob, 0, sx, sy + bob, r);
            g.addColorStop(0, 'rgba(255,170,40,.95)'); g.addColorStop(0.35, 'rgba(255,150,30,.55)'); g.addColorStop(1, 'rgba(255,140,20,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy + bob, r, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000 || 0);
      last = t;
      step(dt);
      draw();
      raf = requestAnimationFrame(frame);
    }
    // start with a little traffic already on the street
    function seed() {
      for (let i = 0; i < 220; i++) step(0.05);
    }
    size();
    addEventListener('resize', size);
    if (!reduce) seed();
    return {
      start() { if (reduce || raf) return; size(); last = performance.now(); raf = requestAnimationFrame(frame); },
      stop() { cancelAnimationFrame(raf); raf = 0; },
    };
  })();
  traffic.start();

  // spotlight + sign light up together
  function poiLight(room, v) {
    $(`.poi[data-room="${room}"]`, world)?.classList.toggle('lit', v);
    $(`.sign[data-room="${room}"]`, world)?.classList.toggle('lit', v);
  }
  function poiOff(room) {
    const g = $(`.poi[data-room="${room}"]`, world);
    if (g && !g.classList.contains('chosen')) poiLight(room, false);
  }
  $$('.poi', world).forEach(g => {
    const room = g.dataset.room;
    g.addEventListener('mouseenter', () => poiLight(room, true));
    g.addEventListener('mouseleave', () => poiOff(room));
    g.addEventListener('focus', () => poiLight(room, true));
    g.addEventListener('blur', () => poiOff(room));
  });
  renderSigns();
  onLang(renderSigns);

  const timeEl = $('#time');
  const tick = () => { timeEl.textContent = new Date().toLocaleTimeString(LANG === 'fr' ? 'fr-CA' : [], { hour: 'numeric', minute: '2-digit' }); };
  tick(); setInterval(tick, 20000);
  onLang(tick);

  /* ==========================================================
     PROJECTS — slides on the boardroom screen
     ========================================================== */
  const QW = 1000, QH = 594;
  const SCREEN = [[502, 202], [1176, 202], [1176, 602], [502, 602]];
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
    const s = quad.parentElement.clientWidth / W;
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
  dotsEl.innerHTML = slides.map(() => '<button type="button"></button>').join('');
  const dots = $$('button', dotsEl);
  const labelDots = () => dots.forEach((d, i) => d.setAttribute('aria-label', t('proj.dot', { n: i + 1 })));
  labelDots(); onLang(labelDots);
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
  const SKILL_LEVELS = [4, 3, 4];
  const skill = i => ({ ...t('skills')[i], level: SKILL_LEVELS[i] });
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
    p.setAttribute('aria-label', skill(i).name);
    const show = () => {
      tip.textContent = skill(i).name;
      tip.style.left = `${((b.x0 + b.x1) / 2 / 1671) * 100}%`;
      tip.style.top = `${(b.y0 / 941) * 100}%`;
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
    const sk = skill(i);
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
      const scene = tome.parentElement, s = scene.clientWidth / 1671;
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
      if (!quick) { skillsRoom.classList.remove('reading'); skillsRoom.style.setProperty('--fx', '.72'); }
      bookPolys.forEach(p => p.classList.remove('taken'));
      openBook = -1;
    }, quick ? 250 : 500);
  }
  $('.tome-close').addEventListener('click', () => closeBook(false));
  onLang(() => {
    bookPolys.forEach(p => p.setAttribute('aria-label', skill(+p.dataset.i).name));
    if (openBook >= 0) {
      const sk = skill(openBook);
      $('.cover-title', tome).textContent = sk.name;
      $('.t-section', tome).textContent = sk.section;
      $('.t-title', tome).textContent = sk.name;
      $('.t-note', tome).textContent = sk.note;
    }
  });

  /* ==========================================================
     HOBBIES — the wall text and the four glass cases
     ========================================================== */
  const HOBBY_COUNT = 4;
  const hobby = i => t('hobbies')[i];
  const ROMAN = ['I', 'II', 'III', 'IV'];
  const wall = $('.wall-text'), cases = $$('.case-hot'), exhibits = $$('.exhibit'), wtDots = $('.wt-dots'), caseTip = $('.case-tip');
  wtDots.innerHTML = Array.from({ length: HOBBY_COUNT }, () => '<button type="button"></button>').join('');
  const labelHobbies = () => {
    $$('button', wtDots).forEach((d, i) => d.setAttribute('aria-label', t('hob.case', { r: ROMAN[i], name: hobby(i).name })));
    cases.forEach(c => { const i = +c.dataset.i; c.setAttribute('aria-label', t('hob.case', { r: ROMAN[i], name: hobby(i).name })); });
  };
  let hobbyI = 0;
  function goHobby(i, instant) {
    hobbyI = (i + HOBBY_COUNT) % HOBBY_COUNT;
    const fill = () => {
      const h = hobby(hobbyI);
      $('.wt-kicker', wall).textContent = t('hob.kicker', { r: ROMAN[hobbyI] });
      $('.wt-title', wall).textContent = h.name;
      $('.wt-desc', wall).textContent = h.desc;
      $('.wt-credit', wall).textContent = t('hob.credit', { item: h.item });
      wall.classList.remove('fade');
    };
    if (instant) fill(); else { wall.classList.add('fade'); setTimeout(fill, 320); }
    cases.forEach((c, k) => c.classList.toggle('on', k === hobbyI));
    exhibits.forEach((c, k) => c.classList.toggle('on', k === hobbyI));
    $$('button', wtDots).forEach((d, k) => d.classList.toggle('on', k === hobbyI));
  }
  labelHobbies();
  cases.forEach(c => {
    const i = +c.dataset.i, b = polyBox(c);
    c.addEventListener('click', () => goHobby(i));
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHobby(i); } });
    c.addEventListener('mouseenter', () => {
      caseTip.textContent = `${ROMAN[i]} · ${hobby(i).name}`;
      caseTip.style.left = `${((b.x0 + b.x1) / 2 / 1671) * 100}%`;
      caseTip.style.top = `${(b.y0 / 941) * 100}%`;
      caseTip.classList.add('on');
    });
    c.addEventListener('mouseleave', () => caseTip.classList.remove('on'));
  });
  onLang(() => { labelHobbies(); goHobby(hobbyI, true); });
  $('.wt-btn.prev').addEventListener('click', () => goHobby(hobbyI - 1));
  $('.wt-btn.next').addEventListener('click', () => goHobby(hobbyI + 1));
  $$('button', wtDots).forEach((d, k) => d.addEventListener('click', () => goHobby(k)));
  goHobby(0, true);

  /* ==========================================================
     CONTACT — the booth buttons
     ========================================================== */
  const lcd = $('#lcd'), contactRoom = $('.room-contact');
  let lcdTimer;
  // longer words (the French ones) shrink to fit the little display
  const showLcd = txt => { lcd.textContent = txt; lcd.style.setProperty('--n', Math.max(10, [...txt].length)); };
  const setLcd = (txt, hold) => {
    clearTimeout(lcdTimer);
    showLcd(txt);
    if (hold) lcdTimer = setTimeout(() => { showLcd(t('lcd.idle')); contactRoom.classList.remove('ringing'); }, hold);
  };
  const lcdIdle = () => { if (!contactRoom.classList.contains('ringing')) setLcd(t('lcd.idle')); };
  onLang(lcdIdle);
  $$('.dp-btn').forEach(a => {
    a.addEventListener('mouseenter', () => setLcd(t('lcd.dial', { who: a.dataset.who })));
    a.addEventListener('mouseleave', lcdIdle);
    a.addEventListener('click', () => { contactRoom.classList.add('ringing'); setLcd(t('lcd.calling', { who: a.dataset.who }), 2400); });
  });

  /* ---------- pick up the phone: leave a message that lands in Youssef's inbox ---------- */
  const MAIL_TO = 'yimgi09@gmail.com';
  const MAIL_ENDPOINT = `https://formsubmit.co/ajax/${MAIL_TO}`;
  const phoneHot = $('#phoneHot'), msgModal = $('.msg-modal'), msgForm = $('#msgForm');
  const msgStatus = $('.tg-status', msgForm), sendBtn = $('.tg-send', msgForm), sendLabel = $('.cc-sent', sendBtn);
  function openMsg() {
    const r = phoneHot.getBoundingClientRect();
    const pop = $('.msg-pop', msgModal);
    msgModal.hidden = false;
    const pr = pop.getBoundingClientRect();
    pop.style.setProperty('--fx', `${f1(r.left + r.width / 2 - (pr.left + pr.width / 2))}px`);
    pop.style.setProperty('--fy', `${f1(r.top + r.height / 2 - (pr.top + pr.height / 2))}px`);
    requestAnimationFrame(() => requestAnimationFrame(() => msgModal.classList.add('show')));
    contactRoom.classList.add('off-hook');
    setLcd(t('lcd.open'));
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
  phoneHot.addEventListener('mouseenter', () => { if (msgModal.hidden) setLcd(t('lcd.pick')); });
  phoneHot.addEventListener('mouseleave', () => { if (msgModal.hidden) lcdIdle(); });
  $('.msg-close').addEventListener('click', closeMsg);
  msgModal.addEventListener('click', e => { if (e.target === msgModal) closeMsg(); });

  const setStatus = (txt, kind) => { msgStatus.textContent = txt; msgStatus.dataset.kind = kind || ''; };
  msgForm.addEventListener('submit', async e => {
    e.preventDefault();
    const f = msgForm.elements;
    const name = f.name.value.trim(), email = f.email.value.trim(), message = f.message.value.trim();
    if (!name || !message) return setStatus(t('form.need'), 'err');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setStatus(t('form.bademail'), 'err');
    if (f._honey.value) return; // bots fill the hidden field
    sendBtn.disabled = true;
    sendLabel.textContent = t('form.sending');
    setStatus(t('form.connecting'));
    setLcd(t('lcd.sending'));
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
      setStatus(t('form.sent'), 'ok');
      sendLabel.textContent = t('form.sentbtn');
      contactRoom.classList.add('ringing');
      setLcd(t('lcd.sent'), 3000);
      setTimeout(() => { sendLabel.textContent = ''; sendBtn.disabled = false; }, 3000);
    } catch (err) {
      sendBtn.disabled = false;
      sendLabel.textContent = t('form.retry');
      setTimeout(() => { sendLabel.textContent = ''; }, 2400);
      setLcd(t('lcd.noanswer'), 2400);
      const mailto = `mailto:${MAIL_TO}?subject=${encodeURIComponent(`Portfolio message from ${name}`)}&body=${encodeURIComponent(message + '\n\n— ' + name + ' (' + email + ')')}`;
      msgStatus.dataset.kind = 'err';
      msgStatus.textContent = t('form.dropped');
      const a = document.createElement('a');
      a.href = mailto;
      a.textContent = t('form.mailapp');
      msgStatus.append(a, '.');
    }
  });

  async function copyEmail(email) {
    try { await navigator.clipboard.writeText(email); return true; } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = email; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      ta.parentNode.removeChild(ta);
      return ok;
    }
  }
  const copyBtn = $('.tg-copy'), copyBtnFr = $('.tg-copy-fr');
  let copyTimer;
  // English: the painted "Copy my address" is a hotspot; feedback shows over it
  copyBtn.addEventListener('click', async () => {
    clearTimeout(copyTimer);
    const ok = await copyEmail(copyBtn.dataset.email);
    const copied = $('.cc-copied');
    copied.textContent = ok ? t('form.copied') : copyBtn.dataset.email;
    copyTimer = setTimeout(() => { copied.textContent = ''; }, 2400);
  });
  // French: the words are real text, so the button itself says it was copied
  copyBtnFr.addEventListener('click', async () => {
    clearTimeout(copyTimer);
    const ok = await copyEmail(copyBtnFr.dataset.email);
    copyBtnFr.textContent = ok ? t('form.copied') : copyBtnFr.dataset.email;
    copyTimer = setTimeout(() => { copyBtnFr.textContent = t('card.copy'); }, 2400);
  });

  /* ==========================================================
     NAVIGATION — zoom from the balcony into a room
     ========================================================== */
  const ROOMS = ['profile', 'projects', 'skills', 'hobbies', 'contact'];
  const roomName = r => t('room.' + r);
  const city = $('#city'), flash = $('.flash');
  const rooms = Object.fromEntries($$('.room').map(r => [r.dataset.room, r]));
  let current = null, timers = [];

  $$('.elevator').forEach(nav => {
    nav.innerHTML = ROOMS.map((r, i) => `<a href="#${r}" data-room="${r}" title="${roomName(r)}" aria-label="${roomName(r)}">${i + 1}</a>`).join('');
  });
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  /* ---------- rain outside every room window ----------
     Each room has a mask of its window glass (traced off the painting), so
     the rain stays behind the frames and behind anyone sitting in front of
     the window, but still falls the full height of the glass. Rain falls
     outside; beads of water cling to the pane, and now and then one grows
     heavy and runs down, leaving a wet trail. */
  const ROOM_WINDOWS = {
    projects: { w: 1672, h: 941, boxes: [[0, 0, 300, 665], [1345, 0, 1672, 665]] },
    profile: { w: 1448, h: 1086, boxes: [[110, 25, 565, 425]] },
    skills: { w: 1671, h: 941, boxes: [[466, 92, 800, 625]] },
    hobbies: { w: 1671, h: 941, boxes: [[0, 30, 160, 640]] },
    contact: { w: 1672, h: 941, boxes: [[160, 0, 530, 935], [1150, 0, 1500, 941]] },
  };
  // one water drop, drawn once: a dark refracted rim below, a pale body, a bright glint up top
  const DROP = (() => {
    const c = document.createElement('canvas'), s = 64;
    c.width = s; c.height = s;
    const g = c.getContext('2d'), r = s / 2 - 2;
    g.translate(s / 2, s / 2);
    let gr = g.createRadialGradient(0, -r * 0.25, r * 0.1, 0, 0, r);
    gr.addColorStop(0, 'rgba(210,218,255,.18)'); gr.addColorStop(0.7, 'rgba(170,180,235,.22)'); gr.addColorStop(1, 'rgba(20,18,50,.55)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
    gr = g.createLinearGradient(0, r * 0.2, 0, r);
    gr.addColorStop(0, 'rgba(230,236,255,0)'); gr.addColorStop(1, 'rgba(230,236,255,.45)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, r * 0.1, r * 0.82, 0.15 * Math.PI, 0.85 * Math.PI); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.beginPath(); g.ellipse(-r * 0.32, -r * 0.38, r * 0.2, r * 0.13, -0.6, 0, Math.PI * 2); g.fill();
    return c;
  })();
  const roomRain = {};
  Object.entries(ROOM_WINDOWS).forEach(([name, cfg]) => {
    const scene = $('.scene', rooms[name]);
    const cv = document.createElement('canvas');
    cv.className = 'room-rain';
    cv.setAttribute('aria-hidden', 'true');
    scene.insertBefore(cv, $('.scene-img', scene).nextSibling);
    const ctx = cv.getContext('2d');
    const mask = new Image();
    mask.src = `assets/rain-mask-${name}.png?v=14`;
    const boxes = cfg.boxes.map(([x0, y0, x1, y1]) => ({ x0, y0, x1, y1 }));
    const area = boxes.reduce((s, b) => s + (b.x1 - b.x0) * (b.y1 - b.y0), 0);
    const pick = () => { let r = Math.random() * area; for (const b of boxes) { r -= (b.x1 - b.x0) * (b.y1 - b.y0); if (r <= 0) return b; } return boxes[0]; };
    const WIND = 0.12;
    // rain falling outside, past the glass
    const streak = (anywhere, b = pick()) => ({
      b, x: b.x0 - 60 + Math.random() * (b.x1 - b.x0 + 60),
      y: anywhere ? b.y0 + Math.random() * (b.y1 - b.y0) : b.y0 - 40 - Math.random() * 80,
      len: 18 + Math.random() * 26, v: 900 + Math.random() * 500, a: 0.1 + Math.random() * 0.16, w: 0.8 + Math.random() * 0.7,
    });
    // beads stuck to the pane
    const bead = (b = pick()) => ({ b, x: b.x0 + Math.random() * (b.x1 - b.x0), y: b.y0 + Math.random() * (b.y1 - b.y0), r: 0.9 + Math.random() * 2.2, life: 6 + Math.random() * 14 });
    // drops running down the glass
    const runner = (b = pick()) => ({
      b, x: b.x0 + 6 + Math.random() * (b.x1 - b.x0 - 12), y: b.y0 + Math.random() * (b.y1 - b.y0) * 0.6,
      r: 2.6 + Math.random() * 2.4, v: 0, hold: 0.5 + Math.random() * 2.5, trail: [], drift: (Math.random() - 0.5) * 0.4,
    });
    const streaks = Array.from({ length: Math.round(area / 1300) }, () => streak(true));
    const beads = Array.from({ length: Math.round(area / 900) }, () => bead());
    const runners = Array.from({ length: Math.max(2, Math.round(area / 22000)) }, () => runner());
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
      ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      ctx.lineCap = 'round';
      // falling rain: a faint tail and a brighter head
      for (const d of streaks) {
        d.y += d.v * dt; d.x += d.v * WIND * dt;
        if (d.y - d.len > d.b.y1) Object.assign(d, streak(false));
        const tx = d.x - d.len * WIND, ty = d.y - d.len;
        ctx.lineWidth = d.w / scale;
        ctx.strokeStyle = `rgba(200,206,255,${d.a * 0.45})`;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(d.x, d.y); ctx.stroke();
        ctx.strokeStyle = `rgba(225,230,255,${d.a})`;
        ctx.beginPath(); ctx.moveTo(d.x - d.len * 0.35 * WIND, d.y - d.len * 0.35); ctx.lineTo(d.x, d.y); ctx.stroke();
      }
      // beads on the glass slowly evaporate and reappear elsewhere
      for (const d of beads) {
        d.life -= dt;
        if (d.life <= 0) Object.assign(d, bead());
        const a = Math.min(1, d.life / 1.5);
        ctx.globalAlpha = 0.85 * a;
        ctx.drawImage(DROP, d.x - d.r, d.y - d.r * 1.1, d.r * 2, d.r * 2.2);
      }
      ctx.globalAlpha = 1;
      // runners: sit, then slide in fits and starts, wandering a little and leaving a wet trail
      for (const d of runners) {
        if (d.hold > 0) d.hold -= dt;
        else {
          d.v = Math.min(160, d.v + 260 * dt);
          if (Math.random() < 0.012) { d.hold = 0.15 + Math.random() * 0.6; d.v = 0; }
          d.y += d.v * dt;
          d.x += d.drift * d.v * dt * 0.15 + (Math.random() - 0.5) * 0.6;
          const lastP = d.trail[d.trail.length - 1];
          if (!lastP || d.y - lastP.y > 3) d.trail.push({ x: d.x, y: d.y, t: 0 });
          // sweep up any beads it runs into, and grow a little
          for (const b of beads) if (Math.abs(b.x - d.x) < d.r + b.r && Math.abs(b.y - d.y) < d.r + b.r) { d.r = Math.min(6, d.r + b.r * 0.08); b.life = 0; }
        }
        for (const p of d.trail) p.t += dt;
        while (d.trail.length && d.trail[0].t > 3.5) d.trail.shift();
        if (d.y > d.b.y1 + 10) { Object.assign(d, runner()); continue; }
        // trail: a thin, fading streak of wet glass with tiny droplets left behind
        for (let i = 1; i < d.trail.length; i++) {
          const p0 = d.trail[i - 1], p1 = d.trail[i], fade = 1 - p1.t / 3.5;
          ctx.strokeStyle = `rgba(205,212,255,${0.08 * fade})`;
          ctx.lineWidth = d.r * 0.75;
          ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
          if (i % 5 === 0) { ctx.globalAlpha = 0.6 * fade; ctx.drawImage(DROP, p1.x - d.r * 0.3, p1.y - d.r * 0.3, d.r * 0.6, d.r * 0.66); ctx.globalAlpha = 1; }
        }
        ctx.drawImage(DROP, d.x - d.r, d.y - d.r * 1.25, d.r * 2, d.r * 2.5);
      }
      // keep everything to the glass: behind the frames and behind people
      if (mask.complete && mask.naturalWidth) {
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(mask, 0, 0, cfg.w, cfg.h);
        ctx.globalCompositeOperation = 'source-over';
      }
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
    if (name) ctlWhere.textContent = `${roomName(neighbour(name, -1))} · ${roomName(neighbour(name, 1))}`;
  }
  $$('.key', controls).forEach(k => k.addEventListener('click', () => {
    const act = k.dataset.act;
    if (act === 'back') { k.classList.remove('press'); void k.offsetWidth; k.classList.add('press'); location.hash = ''; }
    else switchRoom(act === 'prev' ? -1 : 1);
  }));

  function showRoom(name) {
    if (typeof sound !== 'undefined') sound.setIndoors(true);
    runRoomRain(name);
    updateControls(name);
    if (name !== 'skills' && openBook >= 0) closeBook(false);
    Object.entries(rooms).forEach(([k, el]) => { const on = k === name; el.classList.toggle('open', on); el.inert = !on; });
    $$('.elevator a').forEach(a => a.classList.toggle('on', a.dataset.room === name));
    document.title = t('title.room', { room: roomName(name) });
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
    sound.setIndoors(false);
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
    document.title = t('title.home');
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
  onLang(() => {
    $$('.elevator a').forEach(a => { a.title = roomName(a.dataset.room); a.setAttribute('aria-label', roomName(a.dataset.room)); });
    document.title = current ? t('title.room', { room: roomName(current) }) : t('title.home');
    if (current) updateControls(current);
  });
  addEventListener('hashchange', () => route(false));
  addEventListener('resize', () => { if (current === 'projects') fitSlides(); });
  addEventListener('keydown', e => {
    if (introOpen) return; // the enter screen handles its own keys
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


  /* ==========================================================
     RAIN SOUND — made live with the Web Audio API (no audio file):
     a soft hiss of distant rain, a low wash, and scattered drops.
     Browsers only allow sound after the visitor interacts, so it
     starts when they press Enter on the enter screen. Indoors it is
     muffled, as if heard through the window.
     ========================================================== */
  const sound = (() => {
    const btn = $('#soundToggle');
    let wanted = true;
    try { wanted = localStorage.getItem('rain-sound') !== 'off'; } catch (e) { /* storage blocked */ }
    let ctx = null, master = null, tone = null, dropBus = null, dropTimer = 0, indoors = false;

    function noiseBuffer(c, seconds, brown) {
      const len = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
        }
      }
      return buf;
    }
    function loop(buf) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }

    function build() {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0;
      tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 9000; tone.Q.value = 0.4;
      tone.connect(master); master.connect(ctx.destination);
      // steady hiss of rain falling all over the street
      const white = noiseBuffer(ctx, 4, false);
      const hiss = loop(white);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
      const shelf = ctx.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 6000; shelf.gain.value = -10;
      const hissGain = ctx.createGain(); hissGain.gain.value = 0.05;
      hiss.connect(hp).connect(shelf).connect(hissGain).connect(tone);
      // slow swell, so it breathes like real rain instead of sounding like static
      const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
      lfo.frequency.value = 0.07; lfoGain.gain.value = 0.012;
      lfo.connect(lfoGain).connect(hissGain.gain); lfo.start();
      // low wash of water on the road
      const wash = loop(noiseBuffer(ctx, 5, true));
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
      const washGain = ctx.createGain(); washGain.gain.value = 0.11;
      wash.connect(lp).connect(washGain).connect(tone);
      // individual drops: tiny filtered ticks, scattered left and right
      dropBus = ctx.createGain(); dropBus.gain.value = 0.5; dropBus.connect(tone);
      const tick = () => {
        if (!ctx || ctx.state !== 'running') return;
        const t = ctx.currentTime + Math.random() * 0.05;
        const src = ctx.createBufferSource(); src.buffer = white;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800 + Math.random() * 4200; bp.Q.value = 6 + Math.random() * 8;
        const g = ctx.createGain(), peak = 0.03 + Math.random() * 0.09;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03 + Math.random() * 0.05);
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        let node = src.connect(bp).connect(g);
        if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; node = node.connect(pan); }
        node.connect(dropBus);
        src.start(t, Math.random() * 3, 0.1);
      };
      dropTimer = setInterval(() => { const n = 1 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) tick(); }, 70);
      applyPlace(true);
    }
    function applyPlace(instant) {
      if (!ctx) return;
      const t = ctx.currentTime, k = instant ? 0.01 : 0.6;
      // outside: open and bright; inside: heard through glass, quieter and duller
      tone.frequency.setTargetAtTime(indoors ? 1600 : 9000, t, k);
      dropBus.gain.setTargetAtTime(indoors ? 0.25 : 0.5, t, k);
      master.gain.setTargetAtTime(wanted ? (indoors ? 0.55 : 1) : 0, t, instant ? 0.4 : 0.5);
    }
    function render() {
      btn.classList.toggle('off', !wanted);
      btn.setAttribute('aria-pressed', String(wanted));
      btn.setAttribute('aria-label', t(wanted ? 'snd.mute' : 'snd.play'));
      btn.title = t(wanted ? 'snd.on' : 'snd.off');
    }
    function start() {
      if (!wanted) return;
      if (!ctx) build();
      if (ctx.state === 'suspended') ctx.resume();
      applyPlace(false);
    }
    btn.addEventListener('click', e => {
      e.stopPropagation();
      wanted = !wanted;
      try { localStorage.setItem('rain-sound', wanted ? 'on' : 'off'); } catch (err) { /* storage blocked */ }
      render();
      if (wanted) start(); else applyPlace(false);
    });
    // quiet when the tab is hidden
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else if (wanted) ctx.resume();
    });
    render();
    onLang(render);
    return { start, setIndoors(v) { indoors = v; applyPlace(false); } };
  })();

  /* ==========================================================
     ENTER SCREEN — pick a language, then Enter: that click is what
     lets the browser start the rain sound
     ========================================================== */
  const intro = $('#intro'), soundBtn = $('#soundToggle');
  let introOpen = !!intro;
  if (intro) {
    [city, controls, soundBtn, ...Object.values(rooms)].forEach(el => { el.inert = true; });
    const langBox = $('#introLang');
    const showLangChoice = () => {
      langBox.dataset.lang = LANG;
      $$('button', langBox).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === LANG)));
    };
    // the knob only slides when the visitor flips it, not when the saved language loads
    $$('button', langBox).forEach(b => b.addEventListener('click', () => { langBox.classList.add('anim'); if (b.dataset.lang !== LANG) setLang(b.dataset.lang); }));
    onLang(showLangChoice);
    $('#introEnter').addEventListener('click', enterSite);
    setTimeout(() => $('#introEnter').focus({ preventScroll: true }), 60);
  }
  function enterSite() {
    if (!introOpen) return;
    introOpen = false;
    sound.start();
    document.body.classList.remove('intro-open');
    intro.classList.add('leaving');
    city.inert = !!current;
    Object.entries(rooms).forEach(([k, el]) => { el.inert = k !== current; });
    controls.inert = false; soundBtn.inert = false;
    setTimeout(() => { intro.hidden = true; }, reduce ? 0 : 1200);
    if (current) $('.back', rooms[current]).focus({ preventScroll: true });
  }
  applyLang();

  requestAnimationFrame(() => { route(true); fitSlides(); });
})();
