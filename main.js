(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- theme: light / dark / auto ---------- */

  var themeBtn = document.getElementById('themeBtn');
  var media = window.matchMedia('(prefers-color-scheme: dark)');

  function apply(mode) {
    var dark = mode === 'dark' || (mode === 'auto' && media.matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.mode = mode;
    themeBtn.title = 'Display preferences — ' + mode + ' (click to switch)';
    try { localStorage.setItem('ma-theme', mode); } catch (e) {}
  }

  themeBtn.addEventListener('click', function () {
    var order = ['light', 'dark', 'auto'];
    var next = order[(order.indexOf(root.dataset.mode || 'light') + 1) % order.length];
    apply(next);
  });

  media.addEventListener('change', function () {
    if ((root.dataset.mode || 'auto') === 'auto') apply('auto');
  });

  apply(root.dataset.mode || 'light');

  /* ---------- mobile menu ---------- */

  var menuBtn = document.getElementById('menuBtn');
  var menu = document.getElementById('menu');

  function closeMenu() {
    menu.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }

  menuBtn.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') closeMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  /* ---------- carousel ---------- */

  var carousel = document.getElementById('carousel');
  var slides = Array.prototype.slice.call(carousel.querySelectorAll('.stage img'));
  var dots = document.getElementById('cDots');
  var index = 0;
  var timer = null;
  var DELAY = 5200;

  slides.forEach(function (_, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', 'Photo ' + (i + 1) + ' of ' + slides.length);
    b.addEventListener('click', function () { show(i); restart(); });
    dots.appendChild(b);
  });

  var dotEls = Array.prototype.slice.call(dots.children);

  function show(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach(function (s, n) { s.classList.toggle('on', n === index); });
    dotEls.forEach(function (d, n) { d.setAttribute('aria-selected', String(n === index)); });
  }

  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function start() {
    if (timer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(function () { show(index + 1); }, DELAY);
  }
  function restart() { stop(); start(); }

  document.getElementById('cPrev').addEventListener('click', function () { show(index - 1); restart(); });
  document.getElementById('cNext').addEventListener('click', function () { show(index + 1); restart(); });

  carousel.addEventListener('mouseenter', stop);
  carousel.addEventListener('mouseleave', start);
  carousel.addEventListener('focusin', stop);
  carousel.addEventListener('focusout', start);
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

  carousel.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { show(index - 1); restart(); }
    if (e.key === 'ArrowRight') { show(index + 1); restart(); }
  });

  show(0);
  start();

  /* ---------- citation toggles ---------- */

  document.querySelectorAll('[data-cite]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var block = document.getElementById('cite-' + link.dataset.cite);
      if (!block) return;
      var open = block.hasAttribute('hidden');
      if (open) {
        block.removeAttribute('hidden');
        block.classList.add('shown');
        link.setAttribute('aria-expanded', 'true');
      } else {
        block.setAttribute('hidden', '');
        block.classList.remove('shown');
        link.setAttribute('aria-expanded', 'false');
      }
    });
  });

  /* ---------- visit counter ---------- */

  var hits = document.getElementById('hits');
  if (hits) {
    var hitsTotal = document.getElementById('hitsTotal');
    var hitsLatest = document.getElementById('hitsLatest');
    var number = new Intl.NumberFormat('en-US');

    function paint(j) {
      if (!j || j.ok !== true || !Number.isSafeInteger(j.total)) return false;
      hitsTotal.textContent = number.format(j.total);
      if (typeof j.latest === 'string' && !isNaN(new Date(j.latest))) {
        var d = new Date(j.latest);
        hitsLatest.textContent = d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
        hitsLatest.setAttribute('datetime', d.toISOString());
      }
      hits.hidden = false;
      return true;
    }

    function asStats(r) { return r && r.ok ? r.json() : null; }

    function readStats() {
      return fetch('/functions/v1/app?action=stats', { credentials: 'same-origin' })
        .then(asStats)
        .then(paint)
        .catch(function () { /* no counter available: keep the line hidden */ });
    }

    fetch('/functions/v1/app?action=record', { method: 'POST', credentials: 'same-origin' })
      .then(asStats)
      .then(function (j) { if (paint(j)) return null; return readStats(); })
      .catch(readStats);
  }

  /* ---------- back to top ---------- */

  var toTop = document.querySelector('.to-top');
  if (toTop) {
    var checkTop = function () {
      toTop.classList.toggle('up', window.scrollY <= window.innerHeight * .6);
    };
    checkTop();
    window.addEventListener('scroll', checkTop, { passive: true });
    window.addEventListener('resize', checkTop, { passive: true });
  }

  /* ---------- scroll spy ---------- */

  var navLinks = Array.prototype.slice.call(menu.querySelectorAll('a[href^="#"]'));
  var targets = navLinks.map(function (a) {
    return document.getElementById(a.getAttribute('href').slice(1));
  });

  if ('IntersectionObserver' in window) {
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) visible.add(en.target.id);
        else visible.delete(en.target.id);
      });
      var current = targets.find(function (t) { return t && visible.has(t.id); });
      navLinks.forEach(function (a) {
        a.setAttribute('aria-current', String(!!current && a.getAttribute('href') === '#' + current.id));
      });
    }, { rootMargin: '-30% 0px -55% 0px' });
    targets.forEach(function (t) { if (t) io.observe(t); });
  }
})();
