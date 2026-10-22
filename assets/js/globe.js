/* =====================================================================
   Latitude · Globo de puntos (portada)
   Canvas 2D sin dependencias. LATAM se dibuja con más intensidad y las
   conexiones se generan entre puntos aleatorios de la región y otros
   mercados: es una representación ilustrativa, no un mapa de operaciones.
   ===================================================================== */
(function () {
  'use strict';

  var canvas = document.querySelector('[data-globe]');
  var raw = window.LATITUDE_GLOBE_POINTS;
  if (!canvas || !raw || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var DEG = Math.PI / 180;
  var N = raw.length / 3;

  /* ---------- Datos ---------- */
  var VX = new Float32Array(N), VY = new Float32Array(N), VZ = new Float32Array(N);
  var LAT = new Uint8Array(N), DELAY = new Float32Array(N);
  var latamIdx = [], destIdx = [];
  var cLa = -12 * DEG, cLo = -62 * DEG;
  var cx0 = Math.cos(cLa) * Math.sin(cLo), cy0 = Math.sin(cLa), cz0 = Math.cos(cLa) * Math.cos(cLo);

  for (var i = 0; i < N; i++) {
    var la = raw[i * 3] / 10, lo = raw[i * 3 + 1] / 10;
    var a = la * DEG, b = lo * DEG;
    VX[i] = Math.cos(a) * Math.sin(b);
    VY[i] = Math.sin(a);
    VZ[i] = Math.cos(a) * Math.cos(b);
    LAT[i] = raw[i * 3 + 2];
    var dot = VX[i] * cx0 + VY[i] * cy0 + VZ[i] * cz0;
    DELAY[i] = Math.acos(Math.max(-1, Math.min(1, dot))) / Math.PI;
    if (LAT[i]) latamIdx.push(i);
    else if (la > 20 && la < 62 && ((lo > -125 && lo < -62) || (lo > -10 && lo < 32))) destIdx.push(i);
  }

  /* ---------- Estado ---------- */
  var W = 0, H = 0, DPR = 1, R = 0, CX = 0, CY = 0;
  var PX = new Float32Array(N), PY = new Float32Array(N), PR = new Float32Array(N), PB = new Int8Array(N);
  var baseYaw = 60 * DEG, basePitch = -10 * DEG;
  var yaw = baseYaw, pitch = basePitch;
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  var introP = reduce ? 1 : 0, introStart = 0, introDur = 0;
  var running = false, visible = true, rafId = 0, t0 = performance.now();
  var arcs = [], pings = [], nextArc = 0;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width); H = Math.max(1, rect.height);
    DPR = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    R = Math.min(W, H) * 0.4 * DPR;
    CX = canvas.width / 2; CY = canvas.height / 2;
    if (!running) draw(performance.now());
  }

  function rot(x, y, z, out) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    var x1 = x * cy + z * sy;
    var z1 = -x * sy + z * cy;
    out[0] = x1;
    out[1] = y * cp - z1 * sp;
    out[2] = y * sp + z1 * cp;
    return out;
  }
  var tmp = [0, 0, 0];

  function slerp(i0, i1, s, lift, out) {
    var ax = VX[i0], ay = VY[i0], az = VZ[i0], bx = VX[i1], by = VY[i1], bz = VZ[i1];
    var d = Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz));
    var om = Math.acos(d), so = Math.sin(om) || 1e-6;
    var k0 = Math.sin((1 - s) * om) / so, k1 = Math.sin(s * om) / so;
    var h = 1 + Math.sin(Math.PI * s) * lift * om;
    out[0] = (ax * k0 + bx * k1) * h;
    out[1] = (ay * k0 + by * k1) * h;
    out[2] = (az * k0 + bz * k1) * h;
    return out;
  }

  function spawnArc(now) {
    if (!latamIdx.length || !destIdx.length) return;
    var from = latamIdx[(Math.random() * latamIdx.length) | 0];
    var to = destIdx[(Math.random() * destIdx.length) | 0];
    arcs.push({ from: from, to: to, start: now, dur: 2400 + Math.random() * 900 });
  }

  function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function draw(now) {
    var c = ctx;
    c.clearRect(0, 0, canvas.width, canvas.height);
    var ip = introP;
    var ie = easeOut(Math.min(1, ip * 1.15));

    /* Halo y disco */
    var g = c.createRadialGradient(CX - R * .35, CY - R * .4, R * .05, CX, CY, R * 1.25);
    g.addColorStop(0, 'rgba(70,110,225,' + (.34 * ie) + ')');
    g.addColorStop(.62, 'rgba(18,44,130,' + (.22 * ie) + ')');
    g.addColorStop(1, 'rgba(10,38,117,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(CX, CY, R * 1.25, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(169,187,242,' + (.22 * ie) + ')';
    c.lineWidth = DPR;
    c.beginPath(); c.arc(CX, CY, R, 0, Math.PI * 2); c.stroke();

    /* Paralelos (latitudes) */
    var lats = [-60, -30, 0, 30, 60];
    for (var l = 0; l < lats.length; l++) {
      var la = lats[l] * DEG, ca = Math.cos(la), sa = Math.sin(la);
      var front = lats[l] === 0 ? .42 : .16;
      var prevZ = null;
      c.lineWidth = (lats[l] === 0 ? 1.2 : .8) * DPR;
      for (var pass = 0; pass < 2; pass++) {
        c.beginPath();
        var started = false;
        for (var k = 0; k <= 120; k++) {
          var lo = (k / 120) * Math.PI * 2;
          rot(ca * Math.sin(lo), sa, ca * Math.cos(lo), tmp);
          var isFront = tmp[2] >= 0;
          var px = CX + tmp[0] * R, py = CY - tmp[1] * R;
          if ((pass === 0 && isFront) || (pass === 1 && !isFront)) {
            if (!started) { c.moveTo(px, py); started = true; } else c.lineTo(px, py);
          } else started = false;
        }
        c.strokeStyle = pass === 0 ? 'rgba(169,187,242,' + (front * ie) + ')' : 'rgba(169,187,242,' + (.05 * ie) + ')';
        c.stroke();
      }
    }

    /* Puntos */
    var base = R * .0074;
    for (var i = 0; i < N; i++) {
      rot(VX[i], VY[i], VZ[i], tmp);
      var z = tmp[2];
      if (z < 0) { PB[i] = -1; continue; }
      var appear = reduce ? 1 : Math.max(0, Math.min(1, (ip * 1.5 - DELAY[i]) * 3.2));
      if (appear <= 0) { PB[i] = -1; continue; }
      PX[i] = CX + tmp[0] * R;
      PY[i] = CY - tmp[1] * R;
      PR[i] = base * (.55 + .45 * z) * (.4 + .6 * appear) * (LAT[i] ? 1.12 : 1);
      var lv = Math.min(3, Math.floor((.2 + .8 * z) * appear * 4));
      PB[i] = (LAT[i] ? 4 : 0) + lv;
    }
    var alphas = [.18, .36, .58, .82];
    for (var bkt = 0; bkt < 8; bkt++) {
      var isL = bkt >= 4;
      var al = alphas[bkt % 4];
      c.fillStyle = isL ? 'rgba(255,255,255,' + al + ')' : 'rgba(169,187,242,' + (al * .8) + ')';
      c.beginPath();
      for (var j = 0; j < N; j++) {
        if (PB[j] !== bkt) continue;
        c.moveTo(PX[j] + PR[j], PY[j]);
        c.arc(PX[j], PY[j], PR[j], 0, Math.PI * 2);
      }
      c.fill();
    }

    /* Conexiones */
    if (ip >= 1) {
      c.lineCap = 'round';
      for (var a = arcs.length - 1; a >= 0; a--) {
        var arc = arcs[a];
        var t = (now - arc.start) / arc.dur;
        if (!reduce && t >= 1.35) { arcs.splice(a, 1); continue; }
        var head = easeInOut(Math.min(1, t));
        var tail = t > .55 ? easeInOut(Math.min(1, (t - .55) / .8)) : 0;
        if (reduce) { head = 1; tail = 0; }
        var steps = 48, last = null;
        c.lineWidth = 1.5 * DPR;
        for (var s = 0; s <= steps; s++) {
          var u = tail + (head - tail) * (s / steps);
          slerp(arc.from, arc.to, u, .22, tmp);
          rot(tmp[0], tmp[1], tmp[2], tmp);
          var x = CX + tmp[0] * R, y = CY - tmp[1] * R, vis = tmp[2] > -.02 || (tmp[0] * tmp[0] + tmp[1] * tmp[1]) > 1;
          if (last && vis && last.vis) {
            var fade = s / steps;
            c.strokeStyle = 'rgba(169,187,242,' + (.15 + .75 * fade) + ')';
            c.beginPath(); c.moveTo(last.x, last.y); c.lineTo(x, y); c.stroke();
          }
          last = { x: x, y: y, vis: vis };
        }
        if (last && last.vis && head < 1) {
          c.fillStyle = '#fff';
          c.beginPath(); c.arc(last.x, last.y, 2.2 * DPR, 0, Math.PI * 2); c.fill();
        }
        if (head >= 1 && !arc.pinged) {
          arc.pinged = true;
          pings.push({ i: arc.to, start: now });
        }
      }
      for (var p = pings.length - 1; p >= 0; p--) {
        var pg = pings[p], pt = (now - pg.start) / 1100;
        if (pt >= 1) { pings.splice(p, 1); continue; }
        rot(VX[pg.i], VY[pg.i], VZ[pg.i], tmp);
        if (tmp[2] < 0) continue;
        var rx = CX + tmp[0] * R, ry = CY - tmp[1] * R;
        c.strokeStyle = 'rgba(255,255,255,' + (1 - pt) * .8 + ')';
        c.lineWidth = DPR;
        c.beginPath(); c.arc(rx, ry, (3 + pt * 16) * DPR, 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(rx, ry, 2 * DPR, 0, Math.PI * 2); c.fill();
      }
    }
  }

  function frame(now) {
    rafId = 0;
    if (!running) return;
    var t = now - t0;
    if (introDur && introP < 1) introP = Math.min(1, (now - introStart) / introDur);
    mouse.x += (mouse.tx - mouse.x) * .05;
    mouse.y += (mouse.ty - mouse.y) * .05;
    yaw = baseYaw + Math.sin(t * .00011) * .42 + mouse.x * .18;
    pitch = basePitch + Math.sin(t * .00008) * .05 - mouse.y * .08;
    if (introP >= 1 && now > nextArc && arcs.length < 3) {
      spawnArc(now);
      nextArc = now + 900 + Math.random() * 1100;
    }
    draw(now);
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (reduce || running || !visible || document.hidden) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /* ---------- API pública para la coreografía de portada ---------- */
  window.LatitudeGlobe = {
    intro: function (ms) {
      if (reduce) return;
      introStart = performance.now();
      introDur = ms || 2200;
      introP = 0;
      start();
    }
  };

  /* ---------- Eventos ---------- */
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  resize();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }, { rootMargin: '80px' }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });
  if (finePointer && !reduce) {
    window.addEventListener('pointermove', function (e) {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  if (reduce) {
    /* Fotograma estático con tres conexiones completas */
    var now = performance.now();
    for (var s = 0; s < 3; s++) spawnArc(now);
    arcs.forEach(function (a) { a.start = now - a.dur; a.pinged = true; });
    draw(now);
  } else if (!document.documentElement.classList.contains('motion')) {
    introP = 1; start();
  }
  /* Si la coreografía de portada no llega a lanzarse, el globo arranca solo. */
  setTimeout(function () { if (!introDur && !reduce) window.LatitudeGlobe.intro(1600); }, 2600);
})();
