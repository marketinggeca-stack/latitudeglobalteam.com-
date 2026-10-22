/* =====================================================================
   Latitude · Comportamiento y dirección de movimiento
   - Componentes accesibles (menú, pestañas, acordeón, formulario) que
     funcionan aunque fallen las librerías de animación.
   - Motion design con GSAP + ScrollTrigger y desplazamiento suave con
     Lenis. Todo se desactiva con prefers-reduced-motion.
   ===================================================================== */
(function () {
  'use strict';

  var doc = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var motion = hasGsap && !reduce && doc.classList.contains('motion');
  var gsap = window.gsap;
  var lenis = null;

  /* ------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------ */
  $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  function splitWords(el) {
    if (el.getAttribute('data-split-done')) return $$('.w__i', el);
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/);
          if (parts.length === 1 && !parts[0].trim()) return;
          var frag = document.createDocumentFragment();
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            var i = document.createElement('span'); i.className = 'w__i';
            i.textContent = part; w.appendChild(i); frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && !child.classList.contains('sr-only')) {
          walk(child);
        }
      });
    })(el);
    el.setAttribute('data-split-done', '1');
    return $$('.w__i', el);
  }

  function splitChars(el) {
    var text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    var out = [];
    for (var i = 0; i < text.length; i++) {
      var s = document.createElement('span');
      s.className = 'ch'; s.setAttribute('aria-hidden', 'true');
      s.textContent = text[i];
      el.appendChild(s); out.push(s);
    }
    return out;
  }

  var headerH = function () { return ($('#header') || { offsetHeight: 0 }).offsetHeight; };

  /* ------------------------------------------------------------------
     Desplazamiento suave (Lenis) sincronizado con ScrollTrigger
     ------------------------------------------------------------------ */
  if (motion && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', window.ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToEl(el, done) {
    if (!el) return;
    var top = el === document.body ? 0 : el.getBoundingClientRect().top + window.pageYOffset;
    if (lenis) {
      lenis.scrollTo(top, { duration: 1.4, force: true, easing: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }, onComplete: done });
    } else {
      window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
      if (done) setTimeout(done, reduce ? 0 : 700);
    }
  }

  /* ------------------------------------------------------------------
     Intención y área de interés del formulario
     ------------------------------------------------------------------ */
  var form = $('#contact-form');
  var areaInput = $('#f-area'), areaChip = $('#f-area-chip'), areaName = $('#f-area-name');
  function setArea(value) {
    if (!areaInput) return;
    areaInput.value = value || '';
    if (value) { areaName.textContent = value; areaChip.hidden = false; }
    else { areaName.textContent = ''; areaChip.hidden = true; }
  }
  function setIntent(intent) {
    if (!form) return;
    var target = intent === 'llamada' ? 'Agendar una llamada' : 'Enviar una consulta';
    $$('input[name="tipo"]', form).forEach(function (r) { r.checked = r.value === target; });
    updateHelp();
  }
  function updateHelp() {
    var help = $('#f-mensaje-help');
    if (!help || !form) return;
    var call = $('input[name="tipo"]:checked', form);
    help.textContent = call && call.value === 'Agendar una llamada'
      ? help.getAttribute('data-help-default') + ' ' + help.getAttribute('data-help-call')
      : help.getAttribute('data-help-default');
  }
  if (areaChip) $('#f-area-clear').addEventListener('click', function () { setArea(''); $('#f-mensaje').focus(); });
  if (form) $$('input[name="tipo"]', form).forEach(function (r) { r.addEventListener('change', updateHelp); });

  /* ------------------------------------------------------------------
     Enlaces internos
     ------------------------------------------------------------------ */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = id === '#top-of-page' ? document.body : document.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    if (a.hasAttribute('data-intent')) setIntent(a.getAttribute('data-intent'));
    if (a.hasAttribute('data-area')) setArea(a.getAttribute('data-area'));
    closeMenu(false, function () {
      scrollToEl(target, function () {
        if (target !== document.body) target.focus({ preventScroll: true });
      });
    });
    if (history.replaceState) history.replaceState(null, '', id === '#top-of-page' ? location.pathname : id);
  });

  /* ------------------------------------------------------------------
     Cabecera: estado, ocultación, tema según la sección y enlace activo
     ------------------------------------------------------------------ */
  var header = $('#header');
  var themed = $$('[data-theme]').filter(function (el) { return el !== header && el.id !== 'dots'; });
  var navLinks = $$('.nav__link');
  var marker = $('.nav__marker');
  var navTargets = navLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var lastY = window.pageYOffset, ticking = false;
  var dots = $('#dots');
  var dotLinks = dots ? $$('a', dots) : [];
  var dotTargets = dotLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });

  function updateHeader() {
    ticking = false;
    var y = window.pageYOffset;
    var probe = Math.round(headerH() / 2);
    var theme = 'light';
    for (var i = 0; i < themed.length; i++) {
      var r = themed[i].getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) theme = themed[i].getAttribute('data-theme');
    }
    if (!doc.classList.contains('menu-open')) header.setAttribute('data-theme', theme);
    header.classList.toggle('is-scrolled', y > 12);
    var goingDown = y > lastY + 4, goingUp = y < lastY - 4;
    if (goingDown && y > window.innerHeight * .6 && !header.contains(document.activeElement) && !doc.classList.contains('menu-open')) header.classList.add('is-hidden');
    else if (goingUp || y < 80) header.classList.remove('is-hidden');
    lastY = y;

    var active = -1, line = window.innerHeight * .4;
    navTargets.forEach(function (sec, idx) {
      if (!sec) return;
      var r = sec.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) active = idx;
    });
    navLinks.forEach(function (a, idx) {
      var on = idx === active;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    if (dots) {
      var mid = window.innerHeight / 2, current = -1, dotTheme = 'light';
      dotTargets.forEach(function (sec, idx) {
        if (!sec) return;
        var r = sec.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) current = idx;
      });
      if (current === -1 && y + window.innerHeight >= document.documentElement.scrollHeight - 4) current = dotTargets.length - 1;
      for (var t = 0; t < themed.length; t++) {
        var rr = themed[t].getBoundingClientRect();
        if (rr.top <= mid && rr.bottom > mid) dotTheme = themed[t].getAttribute('data-theme');
      }
      dots.setAttribute('data-theme', dotTheme);
      dotLinks.forEach(function (a, idx) {
        if (idx === current) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
    if (marker) {
      if (active > -1) {
        var l = navLinks[active];
        marker.style.width = l.offsetWidth + 'px';
        marker.style.transform = 'translateX(' + l.offsetLeft + 'px)';
        marker.style.opacity = '1';
      } else marker.style.opacity = '0';
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(updateHeader); } }
  if (header) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });
    updateHeader();
  }

  /* ------------------------------------------------------------------
     Menú móvil (diálogo accesible)
     ------------------------------------------------------------------ */
  var burger = $('#burger'), menu = $('#menu');
  var menuTl = null;

  function focusables(root) {
    return $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', root).filter(function (el) { return el.offsetParent !== null; });
  }
  function menuCircle() {
    var r = burger.getBoundingClientRect();
    var x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    var R = Math.ceil(Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)));
    return { from: 'circle(0px at ' + x + 'px ' + y + 'px)', to: 'circle(' + R + 'px at ' + x + 'px ' + y + 'px)' };
  }
  function openMenu() {
    if (!menu) return;
    menu.hidden = false;
    doc.classList.add('menu-open');
    header.classList.remove('is-hidden');
    header.setAttribute('data-theme', 'dark');
    burger.setAttribute('aria-expanded', 'true');
    $('.sr-only', burger).textContent = 'Cerrar menú';
    if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
    if (motion) {
      if (menuTl) menuTl.kill();
      var c0 = menuCircle();
      menuTl = gsap.timeline();
      menuTl.fromTo('.menu__bg', { clipPath: c0.from }, { clipPath: c0.to, duration: .9, ease: 'expo.inOut' })
        .fromTo('.menu__link span', { yPercent: 110 }, { yPercent: 0, duration: .9, stagger: .05, ease: 'expo.out' }, .35)
        .fromTo('.menu__foot', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: .8, ease: 'expo.out' }, .55);
    }
    var f = focusables(menu);
    if (f.length) setTimeout(function () { f[0].focus(); }, motion ? 300 : 0);
  }
  function closeMenu(returnFocus, after) {
    if (!menu || menu.hidden) { if (after) after(); return; }
    burger.setAttribute('aria-expanded', 'false');
    $('.sr-only', burger).textContent = 'Abrir menú';
    var finish = function () {
      menu.hidden = true;
      doc.classList.remove('menu-open');
      if (lenis) lenis.start(); else document.body.style.overflow = '';
      updateHeader();
      if (returnFocus !== false) burger.focus();
      if (after) after();
    };
    if (motion) {
      if (menuTl) menuTl.kill();
      menuTl = gsap.timeline({ onComplete: finish });
      menuTl.to('.menu__link span, .menu__foot', { autoAlpha: 0, y: -10, duration: .25, ease: 'power2.in' })
        .to('.menu__bg', { clipPath: menuCircle().from, duration: .6, ease: 'expo.inOut' }, .1)
        .set('.menu__link span, .menu__foot', { clearProps: 'all' });
    } else finish();
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { menu.hidden ? openMenu() : closeMenu(); });
    document.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
      if (e.key === 'Tab') {
        var f = [burger].concat(focusables(menu));
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (mq) { if (mq.matches) closeMenu(false); });
  }

  /* ------------------------------------------------------------------
     Explorador de áreas de talento (pestañas ARIA)
     ------------------------------------------------------------------ */
  var explorer = $('[data-explorer]');
  if (explorer) {
    var tablist = $('[role="tablist"]', explorer);
    var tabs = $$('[role="tab"]', explorer);
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    var indicator = $('.explorer__indicator', explorer);
    var current = 0;
    var mqMobile = window.matchMedia('(max-width: 1023px)');

    panels.forEach(function (p, i) { p.hidden = i !== 0; });

    function moveIndicator() {
      var t = tabs[current];
      if (!indicator || !t) return;
      indicator.style.height = t.offsetHeight + 'px';
      indicator.style.transform = 'translateY(' + t.offsetTop + 'px)';
    }
    function animatePanel(p) {
      if (!motion) return;
      var title = $('.panel__title', p), items = $$('.profiles li', p), extra = [$('.panel__kicker', p), $('.panel__cta', p)];
      gsap.killTweensOf([title, items, extra]);
      gsap.fromTo(title, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .9, ease: 'expo.out' });
      gsap.fromTo(items, { y: 18, opacity: 0, scale: .94 }, { y: 0, opacity: 1, scale: 1, duration: .7, stagger: .045, ease: 'expo.out', delay: .08 });
      gsap.fromTo(extra, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .7, stagger: .1, ease: 'expo.out', delay: .12 });
      var fig = $('.panel__media', p), img = fig ? $('img', fig) : null;
      if (fig) {
        gsap.killTweensOf([fig, img]);
        gsap.fromTo(fig, { clipPath: 'inset(0% 0% 0% 100% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 1.1, ease: 'expo.inOut', clearProps: 'clipPath' });
        gsap.fromTo(img, { scale: 1.14 }, { scale: 1, duration: 1.6, ease: 'expo.out' });
      }
    }
    function select(i, focus) {
      if (i === current) { if (focus) tabs[i].focus(); return; }
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
      });
      current = i;
      moveIndicator();
      animatePanel(panels[i]);
      if (focus) tabs[i].focus();
      if (mqMobile.matches) {
        var t = tabs[i];
        tablist.scrollTo({ left: t.offsetLeft - 8, behavior: reduce ? 'auto' : 'smooth' });
      }
    }
    tabs.forEach(function (t, i) { t.addEventListener('click', function () { select(i, false); }); });
    tablist.addEventListener('keydown', function (e) {
      var k = e.key, n = tabs.length, i = current;
      if (k === 'ArrowDown' || k === 'ArrowRight') i = (current + 1) % n;
      else if (k === 'ArrowUp' || k === 'ArrowLeft') i = (current - 1 + n) % n;
      else if (k === 'Home') i = 0;
      else if (k === 'End') i = n - 1;
      else return;
      e.preventDefault();
      select(i, true);
    });
    function syncOrientation() { tablist.setAttribute('aria-orientation', mqMobile.matches ? 'horizontal' : 'vertical'); moveIndicator(); }
    mqMobile.addEventListener('change', syncOrientation);
    window.addEventListener('resize', moveIndicator);
    syncOrientation();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);
  }

  /* ------------------------------------------------------------------
     Acordeón de preguntas frecuentes
     ------------------------------------------------------------------ */
  var accBtns = $$('.acc__q');
  var refreshTimer = 0;
  function setAcc(btn, open) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.setAttribute('data-open', open ? 'true' : 'false');
  }
  accBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      accBtns.forEach(function (o) { if (o !== btn && o.getAttribute('aria-expanded') === 'true') setAcc(o, false); });
      setAcc(btn, open);
      if (hasGsap) {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function () { window.ScrollTrigger.refresh(); }, 650);
      }
    });
  });

  /* ------------------------------------------------------------------
     Formulario de contacto: validación y envío real a Netlify Forms
     ------------------------------------------------------------------ */
  if (form) {
    var status = $('#form-status');
    var success = $('#form-success');
    var submitBtn = $('.btn--submit', form);
    var fields = $$('input:not([type="hidden"]):not([name="sitio_web"]):not([type="radio"]), textarea', form);
    var msgs = {
      nombre: { valueMissing: 'Escribe tu nombre.' },
      empresa: { valueMissing: 'Escribe el nombre de tu empresa.' },
      email: { valueMissing: 'Escribe tu correo electrónico.', typeMismatch: 'Revisa el correo: debe tener un formato como nombre@empresa.com.' },
      mensaje: { valueMissing: 'Cuéntanos qué perfil buscas.', tooShort: 'Añade un poco más de detalle (mínimo 10 caracteres).' },
      privacidad: { valueMissing: 'Para enviar la solicitud debes aceptar la política de privacidad.' }
    };
    form.setAttribute('novalidate', '');

    function check(input) {
      var field = input.closest('.field');
      var err = $('.field__err', field);
      if (input.type !== 'checkbox' && input.type !== 'email') input.value = input.value.replace(/^\s+$/, '');
      var v = input.validity, m = msgs[input.name] || {}, text = '';
      if (!v.valid) {
        if (v.valueMissing) text = m.valueMissing || 'Completa este campo.';
        else if (v.typeMismatch) text = m.typeMismatch || 'Revisa el formato.';
        else if (v.tooShort) text = m.tooShort || 'El texto es demasiado corto.';
        else if (v.tooLong) text = 'El texto es demasiado largo.';
        else text = input.validationMessage;
      }
      field.classList.toggle('is-invalid', !!text);
      input.setAttribute('aria-invalid', text ? 'true' : 'false');
      err.textContent = text;
      return !text;
    }
    fields.forEach(function (input) {
      input.addEventListener('blur', function () { if (input.value || input.type === 'checkbox') check(input); });
      input.addEventListener('input', function () { if (input.closest('.field').classList.contains('is-invalid')) check(input); });
      input.addEventListener('change', function () { if (input.type === 'checkbox') check(input); });
    });

    function setLoading(on) {
      submitBtn.disabled = on;
      submitBtn.classList.toggle('is-loading', on);
      $('.btn__label', submitBtn).textContent = on ? 'Enviando…' : 'Enviar solicitud';
    }
    function showError(text) {
      status.className = 'form__status is-error';
      status.textContent = text;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = 'form__status'; status.textContent = '';
      var ok = fields.map(check).every(Boolean);
      if (!ok) {
        showError('Revisa los campos marcados para poder enviar la solicitud.');
        var first = $('.is-invalid .field__input, .is-invalid .check', form);
        if (first) first.focus();
        return;
      }
      if (window.LATITUDE_PREVIEW) {
        showError('Vista previa: el envío se activa al publicar la web en Netlify. No se ha enviado ningún dato.');
        return;
      }
      setLoading(true);
      var body = new URLSearchParams(new FormData(form)).toString();
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          form.hidden = true;
          success.hidden = false;
          success.focus();
          if (motion) gsap.from($$('.form-success > *', success), { y: 16, autoAlpha: 0, stagger: .08, duration: .8, ease: 'expo.out' });
        })
        .catch(function () {
          showError('No hemos podido enviar tu solicitud. Comprueba tu conexión e inténtalo de nuevo en unos minutos.');
        })
        .then(function () { setLoading(false); });
    });

    $('#form-again').addEventListener('click', function () {
      form.reset(); setArea(''); updateHelp();
      fields.forEach(function (f) { f.closest('.field').classList.remove('is-invalid'); f.removeAttribute('aria-invalid'); $('.field__err', f.closest('.field')).textContent = ''; });
      success.hidden = true; form.hidden = false;
      $('#f-nombre').focus();
    });
  }

  /* ------------------------------------------------------------------
     Carriles del proceso: trazado del recorrido entre etapas
     ------------------------------------------------------------------ */
  var lanes = $('[data-lanes]');
  var laneGeom = { fractions: [0, .25, .5, .75, 1], length: 1 };
  function layoutLanes() {
    if (!lanes) return;
    var track = $('.lanes__track', lanes);
    if (!track || getComputedStyle(track).display === 'none') return;
    var steps = $$('[data-step]', lanes), nodes = $$('[data-node]', lanes);
    var tr = track.getBoundingClientRect();
    if (!tr.width) return;
    var pts = steps.map(function (s, i) {
      var r = s.getBoundingClientRect();
      return { x: r.left + r.width / 2 - tr.left, y: i % 2 === 0 ? 12 : tr.height - 12 };
    });
    var col = pts.length > 1 ? pts[1].x - pts[0].x : 100;
    var lead = col * .45;
    var d = 'M' + (pts[0].x - lead).toFixed(1) + ' ' + pts[0].y + ' L' + pts[0].x.toFixed(1) + ' ' + pts[0].y;
    for (var i = 1; i < pts.length; i++) {
      var p0 = pts[i - 1], p1 = pts[i], dx = (p1.x - p0.x) * .5;
      d += ' C' + (p0.x + dx).toFixed(1) + ' ' + p0.y + ' ' + (p1.x - dx).toFixed(1) + ' ' + p1.y + ' ' + p1.x.toFixed(1) + ' ' + p1.y;
    }
    var endX = pts[pts.length - 1].x + lead;
    d += ' L' + endX.toFixed(1) + ' ' + pts[pts.length - 1].y;
    var svg = $('.lanes__svg', lanes);
    svg.setAttribute('viewBox', '0 0 ' + tr.width.toFixed(1) + ' ' + tr.height.toFixed(1));
    $$('path', svg).forEach(function (p) { p.setAttribute('d', d); });
    nodes.forEach(function (n, k) { n.style.left = pts[k].x + 'px'; n.style.top = pts[k].y + 'px'; });
    var path = $('.lanes__path', svg);
    try {
      var total = path.getTotalLength();
      laneGeom.length = total;
      if (motion) path.style.strokeDasharray = total + ' ' + total;
      var seg = (total - lead * 2) / (pts.length - 1);
      laneGeom.fractions = pts.map(function (_, k) { return (lead + seg * k) / total; });
    } catch (err) { /* SVG no disponible */ }
  }
  if (lanes) {
    layoutLanes();
    window.addEventListener('resize', layoutLanes);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutLanes);
    if (!motion) $$('[data-node]', lanes).forEach(function (n) { n.classList.add('is-on'); });
  }

  /* ------------------------------------------------------------------
     Sin animación: todo visible y fin
     ------------------------------------------------------------------ */
  if (!motion) {
    doc.classList.remove('motion');
    doc.classList.add('motion-ready');
    return;
  }

  /* ==================================================================
     DIRECCIÓN DE MOVIMIENTO
     Vocabulario: líneas de latitud que se trazan, palabras que emergen
     de su máscara, hojas que se superponen y telones que se abren.
     ================================================================== */
  var ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  gsap.defaults({ ease: 'expo.out', duration: 1.1 });

  /* Tipografía cinética: preparar palabras */
  var heroLines = $$('.hero__line[data-split]').map(splitWords);
  var splitBlocks = $$('[data-split]').filter(function (el) { return !el.classList.contains('hero__line'); });
  splitBlocks.forEach(splitWords);
  var frontier = $('[data-frontier]');
  var frontierChars = frontier ? splitChars(frontier) : [];

  /* Estados iniciales (antes de mostrar nada) */
  gsap.set('[data-reveal]', { opacity: 0, y: 28 });
  gsap.set('[data-contrib]', { opacity: 0, x: 40 });
  splitBlocks.forEach(function (el) { gsap.set($$('.w__i', el), { yPercent: 115 }); });

  /* ---------------- Portada: coreografía de entrada ---------------- */
  var heroTl = gsap.timeline({ delay: .1 });
  heroTl
    .set('.motion .hero [data-hero], .hero__lines i, .chip, .hero__globe', { visibility: 'visible' }, 0)
    .from('.header__inner', { y: -24, autoAlpha: 0, duration: 1.2 }, .25)
    .from('.hero__lines i', { scaleX: 0, duration: 1.8, stagger: .07, ease: 'expo.inOut' }, 0)
    .fromTo('.latitude-photo--hero', { opacity: 0, scale: 1.2 }, { opacity: window.matchMedia('(max-width: 720px)').matches ? .18 : .28, scale: 1.08, duration: 2.6, ease: 'expo.out', clearProps: 'opacity' }, 0)
    .from('.hero__globe', { scale: .78, autoAlpha: 0, duration: 2.2, onStart: function () { if (window.LatitudeGlobe) window.LatitudeGlobe.intro(2600); } }, .15)
    .from('[data-hero="service"] .mark', { yPercent: 80, autoAlpha: 0, duration: 1 }, .4)
    .from('[data-hero="service"] span', { x: -14, autoAlpha: 0, duration: 1 }, .5)
    .from(heroLines[0] || [], { yPercent: 115, rotate: 4, transformOrigin: '0% 100%', duration: 1.35, stagger: .09 }, .55)
    .from(heroLines[1] || [], { yPercent: 115, rotate: 4, transformOrigin: '0% 100%', duration: 1.35, stagger: .09 }, .72)
    .from('[data-hero="lead"]', { y: 26, autoAlpha: 0, duration: 1.2 }, 1.05)
    .from('[data-hero="text"]', { y: 26, autoAlpha: 0, duration: 1.2 }, 1.15)
    .from('[data-hero="actions"] .btn', { y: 22, autoAlpha: 0, duration: 1.1, stagger: .09 }, 1.25)
    .from('.chip', { autoAlpha: 0, scale: .6, y: 16, duration: 1, stagger: .14, ease: 'back.out(1.7)' }, 1.5)
    .from('[data-hero="scroll"]', { autoAlpha: 0, y: -10, duration: 1 }, 1.9);
  doc.classList.add('motion-ready');

  /* Flotación sutil de las etiquetas de talento */
  $$('.chip').forEach(function (chip, i) {
    gsap.to(chip, { y: (i % 2 ? -1 : 1) * (6 + (i % 3) * 3), duration: 3.2 + i * .45, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2 + i * .2 });
  });

  /* Parallax de puntero en la portada (solo ratón) */
  if (finePointer) {
    var chipsLayer = $('.chips');
    var qx = gsap.quickTo(chipsLayer, 'x', { duration: 1.2, ease: 'power3.out' });
    var qy = gsap.quickTo(chipsLayer, 'y', { duration: 1.2, ease: 'power3.out' });
    $('.hero').addEventListener('pointermove', function (e) {
      qx((e.clientX / window.innerWidth - .5) * -26);
      qy((e.clientY / window.innerHeight - .5) * -18);
    });
  }

  /* Botones magnéticos */
  if (finePointer) {
    $$('.btn--magnetic').forEach(function (btn) {
      var label = $('.btn__label', btn);
      var xTo = gsap.quickTo(btn, 'x', { duration: .6, ease: 'power3.out' });
      var yTo = gsap.quickTo(btn, 'y', { duration: .6, ease: 'power3.out' });
      var lx = label ? gsap.quickTo(label, 'x', { duration: .6, ease: 'power3.out' }) : null;
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        xTo(dx * .18); yTo(dy * .3);
        if (lx) lx(dx * .06);
      });
      btn.addEventListener('pointerleave', function () {
        gsap.to(btn, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, .45)' });
        if (label) gsap.to(label, { x: 0, duration: 1, ease: 'elastic.out(1, .45)' });
      });
    });
  }

  /* ---------------- Escenas de desplazamiento ---------------- */
  var mm = gsap.matchMedia();
  var processInfo = null;
  function scenes() {
  mm.add({ desktop: '(min-width: 1024px)', mobile: '(max-width: 1023px)', wide: '(min-width: 1200px)' }, function (ctx) {
    var c = ctx.conditions;

    /* Salida de la portada: el contenido se aleja mientras la hoja sube */
    gsap.to('.hero__content', { yPercent: -14, opacity: .15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__globe', { yPercent: 16, scale: .9, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__lines', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    /* Fotografías de fondo: profundidad sutil */
    $$('.latitude-photo').forEach(function (img) {
      var sec = img.closest('section');
      gsap.fromTo(img, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* Hojas: las esquinas se aplanan al llegar arriba */
    $$('.sheet').forEach(function (sheet) {
      gsap.fromTo(sheet, { borderTopLeftRadius: c.desktop ? 56 : 28, borderTopRightRadius: c.desktop ? 56 : 28 }, {
        borderTopLeftRadius: 0, borderTopRightRadius: 0, ease: 'none',
        scrollTrigger: { trigger: sheet, start: 'top 85%', end: 'top 10%', scrub: true }
      });
    });

    /* Telones: el fondo oscuro se abre hasta ocupar todo el ancho */
    $$('.curtain').forEach(function (sec) {
      var bg = $('.curtain__bg', sec);
      var inset = c.desktop ? 4.5 : 3;
      gsap.fromTo(bg, { clipPath: 'inset(0% ' + inset + '% 0% ' + inset + '% round 40px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top 92%', end: 'top 20%', scrub: true }
      });
    });

    /* Titulares: las palabras emergen de su máscara */
    splitBlocks.forEach(function (el) {
      var words = $$('.w__i', el);
      var big = el.classList.contains('h2--xl');
      gsap.to(words, {
        yPercent: 0, rotate: 0, duration: big ? 1.5 : 1.25, stagger: big ? .11 : .055,
        startAt: { rotate: big ? 0 : 3, scaleY: big ? 1.35 : 1, transformOrigin: '0% 100%' }, scaleY: 1,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true }
      });
    });

    /* Apariciones en grupo */
    ST.batch('[data-reveal]', {
      start: 'top 90%', once: true,
      onEnter: function (batch) { gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, stagger: .09, overwrite: true }); }
    });

    /* Beneficios: reglas verticales, cifras desde su máscara y mapa en ola */
    gsap.from('.stat__rule', { scaleY: 0, duration: 1.4, stagger: .12, ease: 'expo.inOut', scrollTrigger: { trigger: '.stats', start: 'top 82%', once: true } });
    gsap.from('.stat__num', { yPercent: 110, duration: 1.3, stagger: .12, scrollTrigger: { trigger: '.stats', start: 'top 82%', once: true } });
    gsap.from('.stat__label, .stat__text', { y: 18, opacity: 0, duration: 1, stagger: .05, delay: .25, scrollTrigger: { trigger: '.stats', start: 'top 82%', once: true } });
    gsap.from('.latam-map g', { opacity: 0, y: -2, duration: .6, stagger: .03, ease: 'power2.out', scrollTrigger: { trigger: '.stat--map', start: 'top 80%', once: true } });

    /* Global Team Solutions: el escenario se abre de izquierda a derecha */
    gsap.from('.explorer__stage', { clipPath: 'inset(0% 100% 0% 0% round 34px)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.explorer', start: 'top 78%', once: true } });
    gsap.from('.tab', { x: c.desktop ? -24 : 24, opacity: 0, duration: 1, stagger: .05, scrollTrigger: { trigger: '.explorer', start: 'top 78%', once: true } });
    var firstPanel = $('.panel:not([hidden])');
    if (firstPanel) {
      gsap.from($$('.profiles li', firstPanel), { y: 18, opacity: 0, scale: .94, duration: .8, stagger: .06, delay: .7, scrollTrigger: { trigger: '.explorer', start: 'top 78%', once: true } });
      gsap.from([$('.panel__kicker', firstPanel), $('.panel__title', firstPanel), $('.panel__cta', firstPanel)], { y: 22, opacity: 0, duration: 1, stagger: .1, delay: .55, scrollTrigger: { trigger: '.explorer', start: 'top 78%', once: true } });
      var firstFig = $('.panel__media', firstPanel);
      if (firstFig) {
        gsap.from(firstFig, { clipPath: 'inset(0% 0% 0% 100% round 24px)', duration: 1.4, delay: .5, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: '.explorer', start: 'top 78%', once: true } });
        gsap.from($('img', firstFig), { scale: 1.16, duration: 2, delay: .5, scrollTrigger: { trigger: '.explorer', start: 'top 78%', once: true } });
      }
    }
    gsap.from('.other-profile__rule', { scaleX: 0, duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.other-profile', start: 'top 88%', once: true } });

    /* Nosotros: la imagen se descubre y respira con el scroll */
    gsap.from('.about__frame', { clipPath: 'inset(100% 0% 0% 0% round 34px)', duration: 1.7, ease: 'expo.inOut', scrollTrigger: { trigger: '.about__media', start: 'top 80%', once: true } });
    gsap.from('.about__img', { scale: 1.3, duration: 2.2, ease: 'expo.out', scrollTrigger: { trigger: '.about__media', start: 'top 80%', once: true } });
    gsap.fromTo('.about__frame', { yPercent: 0 }, { yPercent: c.desktop ? -8 : 0, ease: 'none', scrollTrigger: { trigger: '.about__grid', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.about__img', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.about__media', start: 'top bottom', end: 'bottom top', scrub: true } });
    ST.batch('[data-contrib]', {
      start: 'top 86%', once: true,
      onEnter: function (batch) {
        gsap.to(batch, { opacity: 1, x: 0, duration: 1.2, stagger: .14 });
        batch.forEach(function (g, i) { gsap.from($$('li', g), { y: 14, opacity: 0, duration: .9, stagger: .07, delay: .2 + i * .14 }); });
      }
    });

    /* Ventaja LATAM: el mapa flota y las conexiones se trazan con el scroll */
    gsap.fromTo('.latam__map img', { yPercent: 6 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.latam__map', start: 'top bottom', end: 'bottom top', scrub: true } });
    var arcTl = gsap.timeline({ scrollTrigger: { trigger: '.latam__map', start: 'top 75%', end: 'center 35%', scrub: .6 } });
    $$('.latam__arcs .arc').forEach(function (arc, i) {
      var len = arc.getTotalLength();
      arc.style.strokeDasharray = len + ' ' + len;
      arcTl.fromTo(arc, { strokeDashoffset: len }, { strokeDashoffset: 0, ease: 'none', duration: 1 }, i * .3);
    });
    arcTl.from('.arc-dot', { scale: 0, transformOrigin: '50% 50%', stagger: .15, duration: .4, ease: 'back.out(3)' }, '-=.6');
    gsap.from('.pillar__rule', { scaleX: 0, duration: 1.4, stagger: .14, ease: 'expo.inOut', scrollTrigger: { trigger: '.pillars', start: 'top 84%', once: true } });
    gsap.from('.pillar', { y: 40, opacity: 0, duration: 1.2, stagger: .14, scrollTrigger: { trigger: '.pillars', start: 'top 84%', once: true } });
    if (frontierChars.length) {
      var mid = (frontierChars.length - 1) / 2;
      gsap.fromTo(frontierChars, {
        xPercent: function (i) { return (mid - i) * 78; }, opacity: .2
      }, {
        xPercent: 0, opacity: 1, ease: 'power2.out',
        scrollTrigger: { trigger: '.latam__statement', start: 'top 98%', end: 'top 72%', scrub: .6 }
      });
    }

    /* Cómo funciona */
    var steps = $$('[data-step]');
    processInfo = null;
    if (c.wide) {
      layoutLanes();
      var fr = laneGeom.fractions;
      var pinEl = $('.process__pin');
      var pinH = function () { return pinEl.offsetHeight; };
      var pin = pinH() <= window.innerHeight - 8;
      var ptl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: pinEl,
          start: pin ? function () { return 'top top+=' + Math.max(12, Math.round((window.innerHeight - pinH()) / 2)); } : 'top 70%',
          end: pin ? '+=' + Math.round(window.innerHeight * 1.3) : 'bottom 75%',
          scrub: .7, pin: pin, anticipatePin: 1, invalidateOnRefresh: true
        }
      });
      ptl.fromTo('.lanes__path', { strokeDashoffset: function () { return laneGeom.length; } }, { strokeDashoffset: 0, duration: 1 }, 0);
      $$('[data-node]').forEach(function (n, i) {
        var at = Math.max(0, fr[i] - .02);
        ptl.fromTo(n, { scale: .7, backgroundColor: '#F3F5F9', borderColor: 'rgba(33,41,50,.24)', boxShadow: '0 0 0 0px rgba(10,38,117,0)' },
          { scale: 1.15, backgroundColor: '#0A2675', borderColor: '#0A2675', boxShadow: '0 0 0 7px rgba(10,38,117,.12)', duration: .06, ease: 'power2.out' }, at);
        if (steps[i]) ptl.fromTo(steps[i], { opacity: .22, y: i % 2 ? -18 : 18 }, { opacity: 1, y: 0, duration: .1, ease: 'power2.out' }, at);
      });
      ptl.from('.process__close-you', { opacity: 0, y: 24, duration: .08, ease: 'power2.out' }, .9)
         .from('.process__close-lat', { opacity: 0, y: 24, duration: .08, ease: 'power2.out' }, .95)
         .to({}, { duration: .1 });
      if (pin) {
        var D = ptl.duration();
        var prog = fr.map(function (f) { return Math.min(1, (Math.max(0, f - .02) + .12) / D); });
        prog.push(1);
        processInfo = { st: ptl.scrollTrigger, progress: prog };
      }
    } else {
      gsap.fromTo('.lanes__rail i', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.lanes', start: 'top 70%', end: 'bottom 60%', scrub: .5 } });
      steps.forEach(function (s) {
        gsap.from(s, { x: 28, opacity: 0, duration: 1, scrollTrigger: { trigger: s, start: 'top 88%', once: true } });
      });
      gsap.from('.process__close span', { y: 24, opacity: 0, stagger: .12, duration: 1, scrollTrigger: { trigger: '.process__close', start: 'top 90%', once: true } });
    }

    /* Sectores: las palabras se iluminan a medida que avanzas */
    gsap.fromTo('.sector-list li', { opacity: .14 }, {
      opacity: 1, stagger: .5, ease: 'none',
      scrollTrigger: { trigger: '.sector-list', start: 'top 92%', end: c.desktop ? 'bottom 82%' : 'bottom 70%', scrub: .6 }
    });

    /* Actualidad: tarjetas que suben con su imagen descubriéndose */
    ST.batch('[data-post]', {
      start: 'top 88%', once: true,
      onEnter: function (batch) {
        gsap.fromTo(batch, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1.3, stagger: .12 });
        batch.forEach(function (p, i) {
          gsap.fromTo($('.post__media', p), { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, delay: .1 + i * .12, ease: 'expo.inOut' });
        });
      }
    });
    gsap.set('[data-post]', { opacity: 0 });

    /* Llamada final: líneas en profundidad */
    gsap.fromTo('.cta__lines', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* Pie: la marca emerge al final del recorrido */
    gsap.fromTo('.footer__mark span', { yPercent: 70 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    gsap.from('.footer__claim span', { yPercent: 60, opacity: 0, duration: 1.3, stagger: .12, scrollTrigger: { trigger: '.footer', start: 'top 85%', once: true } });

    return function () { /* matchMedia revierte automáticamente al cambiar de tamaño */ };
  });
  }
  /* Las escenas se calculan con la tipografía definitiva cargada */
  var scenesDone = false;
  function runScenes() { if (scenesDone) return; scenesDone = true; layoutLanes(); scenes(); ST.refresh(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(runScenes);
  setTimeout(runScenes, 1500);

  /* Recalcular tras cargar fuentes e imágenes */
  window.addEventListener('load', function () { ST.refresh(); });

  /* ------------------------------------------------------------------
     Navegación por secciones encuadradas (escritorio con ratón o trackpad)
     Cada gesto de rueda o PageDown/Espacio lleva a la siguiente parada.
     Las secciones más altas que la pantalla tienen paradas intermedias,
     así nunca se salta contenido; en "Cómo funciona" cada gesto avanza
     una etapa. En móvil y tableta táctil el desplazamiento es nativo.
     ------------------------------------------------------------------ */
  (function stepper() {
    if (!lenis) return;
    var mq = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
    var order = ['inicio', 'por-que-latitude', 'areas', 'nosotros', 'ventaja-latam', 'como-funciona', 'sectores', 'otros-servicios', 'actualidad', 'preguntas', 'empezamos', 'contacto'];
    var stops = [], busy = false, lastWheel = 0, accum = 0;
    var ease = function (t) { return t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; };

    function docTop(el) { return Math.round(el.getBoundingClientRect().top + window.pageYOffset); }
    function compute() {
      var vh = window.innerHeight, max = document.documentElement.scrollHeight - vh, list = [];
      /* pri: 3 = inicio de sección o etapa del proceso, 2 = bloque marcado, 1 = final de sección encuadrado */
      order.forEach(function (id) {
        var sec = document.getElementById(id);
        if (!sec) return;
        if (id === 'como-funciona' && processInfo && processInfo.st) {
          var st = processInfo.st;
          processInfo.progress.forEach(function (p) { list.push({ y: Math.round(st.start + (st.end - st.start) * p), pri: 4 }); });
          return;
        }
        var top = docTop(sec), bottom = top;
        $$('.wrap > *', sec).forEach(function (el) {
          if (el.offsetParent === null) return;
          bottom = Math.max(bottom, docTop(el) + el.offsetHeight);
        });
        bottom = Math.min(top + sec.offsetHeight, bottom + Math.round(vh * .1));
        var padTop = parseFloat(getComputedStyle(sec).paddingTop) || 0;
        var over = bottom - vh - top;
        /* Si lo que no cabe es solo el margen superior, un único encuadre ajustado al final */
        if (over > 0 && over <= padTop) { list.push({ y: top + over, pri: 3 }); return; }
        list.push({ y: top, pri: 3 });
        $$('[data-snap]', sec).forEach(function (a) { list.push({ y: docTop(a) - Math.round(vh * .14), pri: 2 }); });
        if (over > 40) list.push({ y: bottom - vh, pri: 1 });
      });
      list.push({ y: max, pri: 4 });
      list.forEach(function (o) { o.y = Math.max(0, Math.min(max, o.y)); });
      list.sort(function (a, b) { return a.y - b.y; });
      var merged = [];
      list.forEach(function (o) {
        var prev = merged[merged.length - 1];
        var thr = (prev && prev.pri === 4 && o.pri === 4) ? 8 : ((prev && (prev.pri === 1 || o.pri === 1)) ? 120 : vh * .24);
        if (prev && o.y - prev.y < thr) { if (o.pri > prev.pri) merged[merged.length - 1] = o; return; }
        merged.push(o);
      });
      var out = [];
      merged.forEach(function (o) {
        if (out.length) {
          var prev = out[out.length - 1], gap = o.y - prev;
          if (gap > vh * 1.5) {
            var n = Math.ceil(gap / (vh * .9));
            for (var k = 1; k < n; k++) out.push(Math.round(prev + gap * k / n));
          }
        }
        out.push(o.y);
      });
      stops = out;
    }

    function go(dir) {
      var y = window.pageYOffset, target;
      if (dir > 0) { for (var i = 0; i < stops.length; i++) if (stops[i] > y + 6) { target = stops[i]; break; } }
      else { for (var j = stops.length - 1; j >= 0; j--) if (stops[j] < y - 6) { target = stops[j]; break; } }
      if (target === undefined) return false;
      busy = true;
      var dist = Math.abs(target - y) / window.innerHeight;
      lenis.scrollTo(target, {
        duration: Math.min(1.35, .85 + dist * .25), easing: ease, force: true, lock: true,
        onComplete: function () {
          (function quiet() {
            if (performance.now() - lastWheel > 170) busy = false; else setTimeout(quiet, 60);
          })();
        }
      });
      return true;
    }

    function nativeTarget(el) {
      return el && el.closest && el.closest('textarea, select, .menu, [data-lenis-prevent]');
    }

    window.addEventListener('wheel', function (e) {
      if (!mq.matches || e.ctrlKey || nativeTarget(e.target)) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      lastWheel = performance.now();
      if (busy) return;
      accum += e.deltaY;
      if (Math.abs(accum) < 12) return;
      var dir = accum > 0 ? 1 : -1;
      accum = 0;
      go(dir);
    }, { passive: false, capture: true });

    document.addEventListener('keydown', function (e) {
      if (!mq.matches || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      var el = document.activeElement;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.closest('[role="tablist"], .menu'))) return;
      var k = e.key, dir = 0;
      if (k === 'PageDown' || (k === ' ' && !e.shiftKey && !(el && /^(BUTTON|A)$/.test(el.tagName)))) dir = 1;
      else if (k === 'PageUp' || (k === ' ' && e.shiftKey)) dir = -1;
      else if (k === 'ArrowDown' && (!el || el === document.body || el.tagName === 'SECTION')) dir = 1;
      else if (k === 'ArrowUp' && (!el || el === document.body || el.tagName === 'SECTION')) dir = -1;
      else if (k === 'Home' || k === 'End') {
        if (el && el.tagName !== 'BODY' && el.tagName !== 'SECTION') return;
        e.preventDefault();
        lenis.scrollTo(k === 'Home' ? 0 : document.documentElement.scrollHeight, { duration: 1.4, easing: ease, force: true });
        return;
      }
      if (!dir) return;
      e.preventDefault();
      if (!busy) go(dir);
    });

    ST.addEventListener('refresh', compute);
    window.addEventListener('resize', compute);
    compute();
    window.LatitudeStops = function () { return stops.slice(); };
  })();

  /* Si se entra con un ancla en la URL, colocar la sección tras preparar las escenas */
  if (location.hash && location.hash.length > 1) {
    var initial = document.getElementById(location.hash.slice(1));
    if (initial) setTimeout(function () { ST.refresh(); scrollToEl(initial); }, 350);
  }
})();
