/* =========================================================
   HOLMES LAW — interações
   ========================================================= */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Header + rail de progresso + voltar ao topo ---------- */

  (function () {
    var header = $('#siteHeader');
    var fill   = $('#railFill');
    var toTop  = $('#toTop');
    var ticking = false;

    function update() {
      var y = window.scrollY || window.pageYOffset;
      var max = document.documentElement.scrollHeight - window.innerHeight;

      if (header) header.classList.toggle('is-stuck', y > 40);
      if (fill)   fill.style.height = (max > 0 ? Math.min(y / max, 1) * 100 : 0) + '%';
      if (toTop)  toTop.classList.toggle('is-on', y > window.innerHeight * 0.7);

      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });

    window.addEventListener('resize', update, { passive: true });
    update();

    if (toTop) {
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      });
    }
  })();

  /* ---------- Menu mobile ---------- */

  (function () {
    var toggle   = $('#navToggle');
    var menu     = $('#mobileMenu');
    var backdrop = $('#menuBackdrop');
    if (!toggle || !menu || !backdrop) return;

    var links = $$('a', menu);
    links.forEach(function (a, i) { a.style.setProperty('--i', i); });

    function open() {
      menu.classList.add('is-open');
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Fechar menu');
      menu.setAttribute('aria-hidden', 'false');
      backdrop.hidden = false;
      document.body.classList.add('is-locked');
      window.requestAnimationFrame(function () { backdrop.classList.add('is-on'); });
    }

    function close() {
      menu.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menu');
      menu.setAttribute('aria-hidden', 'true');
      backdrop.classList.remove('is-on');
      document.body.classList.remove('is-locked');
      window.setTimeout(function () { backdrop.hidden = true; }, 350);
    }

    toggle.addEventListener('click', function () {
      menu.classList.contains('is-open') ? close() : open();
    });

    backdrop.addEventListener('click', close);
    links.forEach(function (a) { a.addEventListener('click', close); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        close();
        toggle.focus();
      }
    });
  })();

  /* ---------- Reveal ao rolar ---------- */

  (function () {
    var items = $$('.reveal');
    if (!items.length) return;

    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    // escalona irmãos dentro de um mesmo grupo
    var groups = {};
    items.forEach(function (el) {
      var key = el.parentNode;
      groups[key] = groups[key] || [];
      var list = groups[key];
      el.style.setProperty('--d', Math.min(list.length, 5) * 0.08 + 's');
      list.push(el);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    items.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- Contadores ---------- */

  (function () {
    var nums = $$('[data-count]');
    if (!nums.length) return;

    function run(el) {
      var end    = parseFloat(el.getAttribute('data-count'));
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      var plain  = el.getAttribute('data-plain') === 'true';
      var start  = plain ? Math.max(end - 40, 0) : 0;

      if (reduced || isNaN(end)) {
        el.textContent = prefix + end + suffix;
        return;
      }

      var t0 = null;
      var dur = 1400;

      function step(t) {
        if (t0 === null) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var value = Math.round(start + (end - start) * eased);
        el.textContent = prefix + value + suffix;
        if (p < 1) window.requestAnimationFrame(step);
      }

      window.requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    nums.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- Faixa rolante contínua ---------- */

  (function () {
    var strip = $('#docket');
    var track = $('#docketTrack');
    if (!strip || !track) return;

    var group = $('.docket-group', track);
    if (!group) return;

    var SPEED = 42; // pixels por segundo — mude aqui para acelerar ou desacelerar

    function build() {
      // limpa clones de uma passada anterior
      $$('.docket-group', track).forEach(function (g, i) {
        if (i > 0) g.parentNode.removeChild(g);
      });

      var w = group.getBoundingClientRect().width;
      var visible = strip.getBoundingClientRect().width;

      // se nao deu para medir, cai para a lista estatica em vez de tira parada
      if (!w) { strip.classList.add('is-static'); return; }
      strip.classList.remove('is-static');

      // clones suficientes para cobrir a tela inteira mais uma volta de folga
      var copies = Math.max(2, Math.ceil(visible / w) + 1);
      for (var i = 1; i < copies; i++) {
        track.appendChild(group.cloneNode(true));
      }

      // desloca exatamente a largura de um grupo: o loop fecha sem salto
      track.style.setProperty('--shift', w + 'px');
      track.style.setProperty('--dur', (w / SPEED).toFixed(2) + 's');
    }

    build();

    // a largura muda quando a fonte real substitui a de fallback
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(build);
    }

    var rid;
    window.addEventListener('resize', function () {
      window.clearTimeout(rid);
      rid = window.setTimeout(build, 220);
    }, { passive: true });
  })();

  /* ---------- Carrossel de áreas ---------- */

  (function () {
    var root  = $('#carousel');
    var track = $('#carouselTrack');
    var dots  = $('#carouselDots');
    var prev  = $('#prevBtn');
    var next  = $('#nextBtn');
    if (!root || !track) return;

    var slides = $$('.case', track);
    var index = 0;
    var perView = 3;
    var maxIndex = 0;

    function measure() {
      var w = window.innerWidth;
      perView = w <= 640 ? 1 : (w <= 1080 ? 2 : 3);
      maxIndex = Math.max(slides.length - perView, 0);
      index = Math.min(index, maxIndex);
    }

    function buildDots() {
      if (!dots) return;
      dots.innerHTML = '';
      for (var i = 0; i <= maxIndex; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Ir para o slide ' + (i + 1));
        b.addEventListener('click', (function (n) {
          return function () { index = n; render(); };
        })(i));
        dots.appendChild(b);
      }
    }

    function render() {
      if (!slides.length) return;
      var step = slides[0].getBoundingClientRect().width + 24;
      track.style.transform = 'translate3d(' + (-index * step) + 'px,0,0)';

      slides.forEach(function (s, i) {
        var visible = i >= index && i < index + perView;
        s.setAttribute('aria-hidden', visible ? 'false' : 'true');
      });

      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index >= maxIndex;

      if (dots) {
        $$('button', dots).forEach(function (b, i) {
          b.classList.toggle('is-on', i === index);
          b.setAttribute('aria-selected', i === index ? 'true' : 'false');
        });
      }
    }

    function go(delta) {
      index = Math.max(0, Math.min(index + delta, maxIndex));
      render();
    }

    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { go(-1); }
      if (e.key === 'ArrowRight') { go(1); }
    });

    // arrastar com mouse / toque
    var startX = 0, dragging = false;

    track.addEventListener('pointerdown', function (e) {
      dragging = true;
      startX = e.clientX;
      track.classList.add('is-dragging');
      track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointerup', function (e) {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
      else render();
    });

    track.addEventListener('pointercancel', function () {
      dragging = false;
      track.classList.remove('is-dragging');
      render();
    });

    var rid;
    window.addEventListener('resize', function () {
      window.clearTimeout(rid);
      rid = window.setTimeout(function () {
        var before = maxIndex;
        measure();
        if (before !== maxIndex) buildDots();
        render();
      }, 140);
    }, { passive: true });

    measure();
    buildDots();
    render();
  })();

  /* ---------- Acordeão do FAQ ---------- */

  (function () {
    var items = $$('.acc-item');
    if (!items.length) return;

    items.forEach(function (item, i) {
      var btn   = $('.acc-trigger', item);
      var panel = $('.acc-panel', item);
      if (!btn || !panel) return;

      var id = 'acc-panel-' + (i + 1);
      panel.id = id;
      btn.setAttribute('aria-controls', id);

      function collapseOthers() {
        items.forEach(function (other) {
          if (other === item) return;
          var b = $('.acc-trigger', other);
          var p = $('.acc-panel', other);
          if (b && b.getAttribute('aria-expanded') === 'true') shut(b, p);
        });
      }

      function shut(b, p) {
        b.setAttribute('aria-expanded', 'false');
        if (reduced) { p.hidden = true; return; }
        p.style.height = p.scrollHeight + 'px';
        void p.offsetHeight;
        p.style.height = '0px';
        window.setTimeout(function () {
          if (b.getAttribute('aria-expanded') === 'false') {
            p.hidden = true;
            p.style.height = '';
          }
        }, 420);
      }

      function open(b, p) {
        b.setAttribute('aria-expanded', 'true');
        p.hidden = false;
        if (reduced) return;
        p.style.height = '0px';
        void p.offsetHeight;
        p.style.height = p.scrollHeight + 'px';
        window.setTimeout(function () {
          if (b.getAttribute('aria-expanded') === 'true') p.style.height = 'auto';
        }, 420);
      }

      btn.addEventListener('click', function () {
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        if (isOpen) {
          shut(btn, panel);
        } else {
          collapseOthers();
          open(btn, panel);
        }
      });
    });
  })();

  /* ---------- Formulário de contato ---------- */

  (function () {
    var form = $('#contactForm');
    if (!form) return;

    var success = $('#formSuccess');
    var mail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function setError(field, message) {
      var wrap = field.closest('.field');
      var note = wrap ? $('.field-error', wrap) : null;
      if (wrap) wrap.classList.toggle('has-error', !!message);
      if (note) note.textContent = message || '';
      return !message;
    }

    function check(field) {
      var value = (field.value || '').trim();

      if (field.hasAttribute('required') && !value) {
        return setError(field, 'Campo obrigatório.');
      }
      if (field.type === 'email' && value && !mail.test(value)) {
        return setError(field, 'Informe um e-mail válido.');
      }
      if (field.id === 'f-message' && value && value.length < 12) {
        return setError(field, 'Descreva um pouco mais a situação.');
      }
      return setError(field, '');
    }

    $$('input, select, textarea', form).forEach(function (field) {
      field.addEventListener('blur', function () { check(field); });
      field.addEventListener('input', function () {
        var wrap = field.closest('.field');
        if (wrap && wrap.classList.contains('has-error')) check(field);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var fields = $$('[required]', form);
      var ok = true;
      var first = null;

      fields.forEach(function (field) {
        if (!check(field)) {
          ok = false;
          if (!first) first = field;
        }
      });

      if (!ok) {
        if (first) first.focus();
        return;
      }

      // Sem back-end: troque este bloco pelo envio real (fetch, Formspree, etc.)
      if (success) success.hidden = false;
      form.reset();
      $$('.field', form).forEach(function (w) { w.classList.remove('has-error'); });
      window.setTimeout(function () { if (success) success.hidden = true; }, 7000);
    });
  })();

  /* ---------- Imagem remota que falha ---------- */

  (function () {
    // 1x1 transparente. Trocar o src por ele faz o navegador considerar a
    // imagem carregada: some o icone de "imagem quebrada" e o fundo gravado
    // do CSS aparece no lugar, em vez de um retangulo vazio.
    var VAZIO = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    function cair(img) {
      if (img.getAttribute('src') !== VAZIO) {
        img.setAttribute('src', VAZIO);
        img.setAttribute('data-fallback', 'true');
      }
    }

    $$('img').forEach(function (img) {
      img.addEventListener('error', function () { cair(img); });
      // ja falhou antes do script rodar
      if (img.complete && img.naturalWidth === 0) cair(img);
    });
  })();

  /* ---------- Parallax discreto no retrato do hero ---------- */

  (function () {
    var img = $('#heroImg');
    if (!img || reduced) return;

    var ticking = false;

    function move() {
      var y = window.scrollY || window.pageYOffset;
      if (y < window.innerHeight * 1.2) {
        img.style.transform = 'translate3d(0,' + (y * 0.06) + 'px,0) scale(1.02)';
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(move); ticking = true; }
    }, { passive: true });
  })();

})();
