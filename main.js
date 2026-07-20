/* KILONOVA - main.js (vanilla, 0 external requests) */
document.documentElement.classList.add('js');

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var motionOK = !reduceMotion;

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else { fn(); }
  }

  onReady(function () {

    /* 1. Reduced motion: just show everything, skip animation logic */
    if (reduceMotion) {
      document.querySelectorAll('.fu').forEach(function (el) { el.classList.add('on'); });
      document.querySelectorAll('section, footer').forEach(function (el) { el.classList.add('inview'); });
    } else {

      /* 2. Hero cascade: .fu -> .on with ~0.08s stagger */
      var fus = document.querySelectorAll('.fu');
      fus.forEach(function (el, i) {
        setTimeout(function () { el.classList.add('on'); }, 120 + i * 80);
      });

      /* 5. Reveal sections: .inview once via IntersectionObserver */
      var revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('inview');
            revealIO.unobserve(en.target);
          }
        });
      }, { threshold: 0.25 });
      document.querySelectorAll('section, footer').forEach(function (el) {
        revealIO.observe(el);
      });
    }

    /* 3. Burger + menu */
    var burger = document.getElementById('burger');
    var menu = document.querySelector('.menu');
    function setMenu(open) {
      burger.classList.toggle('open', open);
      menu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    if (burger && menu) {
      burger.addEventListener('click', function () {
        setMenu(!menu.classList.contains('open'));
      });
      menu.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function () { setMenu(false); });
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false);
      });
    }

    /* 4. Nav: smooth scroll to #sections */
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      });
    });

    /* 4b. Active link highlight */
    var navLinks = Array.prototype.slice.call(
      document.querySelectorAll('.nav__link, .menu a[href^="#"]')
    );
    var sections = ['hero', 'origin', 'collection', 'trajectory', 'viewing']
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    function markActive(id) {
      navLinks.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
      });
    }
    if ('IntersectionObserver' in window && sections.length) {
      var navIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) markActive(en.target.id);
        });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      sections.forEach(function (s) { navIO.observe(s); });
    }

    /* 6. Collection spotlight: --mx/--my on .piece__spot (pointer:fine + motion) */
    if (finePointer && motionOK) {
      var spots = [];
      document.querySelectorAll('.piece').forEach(function (piece) {
        var spot = piece.querySelector('.piece__spot');
        if (!spot) return;
        var state = { spot: spot, x: -999, y: -999, tx: -999, ty: -999 };
        piece.addEventListener('pointermove', function (e) {
          var r = spot.getBoundingClientRect();
          state.tx = e.clientX - r.left;
          state.ty = e.clientY - r.top;
        });
        piece.addEventListener('pointerleave', function () {
          state.tx = -999;
          state.ty = -999;
        });
        spots.push(state);
      });

      if (spots.length) {
        (function loop() {
          spots.forEach(function (s) {
            var nx = s.x + (s.tx - s.x) * 0.12;
            var ny = s.y + (s.ty - s.y) * 0.12;
            if (Math.abs(nx - s.x) > 0.05 || Math.abs(ny - s.y) > 0.05) {
              s.x = nx; s.y = ny;
              s.spot.style.setProperty('--mx', s.x.toFixed(1) + 'px');
              s.spot.style.setProperty('--my', s.y.toFixed(1) + 'px');
            }
          });
          requestAnimationFrame(loop);
        })();
      }

      /* 7. Origin halo follows cursor with lerp ~0.06 */
      var origin = document.getElementById('origin');
      var halo = document.getElementById('halo');
      if (origin && halo) {
        var hx = -999, hy = -999, htx = -999, hty = -999;
        origin.addEventListener('pointerenter', function (e) {
          var r = origin.getBoundingClientRect();
          hx = htx = e.clientX - r.left;
          hy = hty = e.clientY - r.top;
          halo.style.opacity = '1';
        });
        origin.addEventListener('pointermove', function (e) {
          var r = origin.getBoundingClientRect();
          htx = e.clientX - r.left;
          hty = e.clientY - r.top;
        });
        origin.addEventListener('pointerleave', function () {
          halo.style.opacity = '0';
        });
        (function haloLoop() {
          hx += (htx - hx) * 0.06;
          hy += (hty - hy) * 0.06;
          halo.style.transform =
            'translate(' + hx.toFixed(1) + 'px,' + hy.toFixed(1) + 'px) translate(-50%,-50%)';
          requestAnimationFrame(haloLoop);
        })();
      }
    }

    /* Trajectory scroll-drawn path + comet + dot placement + starflare */
    if (motionOK) {
      setTimeout(function() {
        var path = document.querySelector('.trajectory__path');
        var comet = document.querySelector('.trajectory__comet');
        if (path && window.gsap && window.ScrollTrigger) {
          var len = path.getTotalLength();
          if (len <= 0) return;
          path.style.strokeDasharray = len;
          path.style.strokeDashoffset = len;

          /* Place 4 dots strictly on the path; крайние — точно на концах пути */
          var dotFracs = [0.0, 0.33, 0.60, 1.0];
          var stageEl = document.querySelector('.trajectory__stage');
          var dots = [];
          var placedDots = [];
          for (var di = 0; di < dotFracs.length; di++) {
            var dot = document.querySelector('.trajectory__dot--' + (di + 1));
            var ptD = path.getPointAtLength(len * dotFracs[di]);
            if (dot) {
              dot.setAttribute('cx', ptD.x);
              dot.setAttribute('cy', ptD.y);
              dots.push({ el: dot, frac: dotFracs[di] });
            }
            placedDots.push(dot);
          }
          /* Подписи привязываем к РЕАЛЬНОЙ экранной позиции своих точек (а не % от viewBox) —
             тогда они совпадают с маркерами при любой ширине экрана. */
          function alignNotes() {
            var sr = stageEl.getBoundingClientRect();
            for (var k = 0; k < dotFracs.length; k++) {
              var note = document.querySelector('.trajectory__note--' + (k + 1));
              if (note && placedDots[k]) {
                var dr = placedDots[k].getBoundingClientRect();
                note.style.top = (dr.top + dr.height / 2 - sr.top) + 'px';
              }
            }
          }
          alignNotes();
          window.addEventListener('resize', alignNotes);

          /* подписи не синхронизируем с кометой (юзер: «пусть проскакивает») —
             просто показываем все, комета проходит через точки независимо */
          document.querySelectorAll('.trajectory__note').forEach(function(n){ n.classList.add('is-active'); });
          var prevProgress = 0;
          gsap.to(path, {
            strokeDashoffset: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: '.trajectory__stage',
              start: 'top 85%',
              end: 'bottom 80%',
              scrub: 0.3,
              onUpdate: function(self) {
                var p = self.progress;
                if (comet) {
                  var pt = path.getPointAtLength(len * p);
                  comet.setAttribute('cx', pt.x);
                  comet.setAttribute('cy', pt.y);
                  /* видима от старта и до самого конца — приземляется точно на последнюю точку */
                  comet.style.opacity = (p > 0.01) ? '1' : '0';
                }
                for (var j = 0; j < dots.length; j++) {
                  var f = dots[j].frac;
                  /* Starflare: усиленная вспышка при пересечении точки (класс снимается,
                     базовая пульсация dotPulse возвращается) */
                  if ((prevProgress < f && p >= f) || (prevProgress > f && p <= f)) {
                    (function(d){
                      d.classList.remove('is-hit');
                      void d.offsetWidth;
                      d.classList.add('is-hit');
                      setTimeout(function(){ d.classList.remove('is-hit'); }, 720);
                    })(dots[j].el);
                  }
                }
                prevProgress = p;
              }
            }
          });
        }
      }, 100);
    }

    /* 8. Form: textarea autogrow + demo submit */
    var area = document.querySelector('.field__area');
    if (area) {
      var autoGrow = function () {
        area.style.height = 'auto';
        area.style.height = area.scrollHeight + 'px';
      };
      area.addEventListener('input', autoGrow);
      autoGrow();
    }

    var form = document.getElementById('viewing-form');
    var success = document.getElementById('form-success');
    var error = document.getElementById('form-error');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        form.classList.add('tried');
        if (!form.checkValidity()) {
          if (error) error.hidden = false;
          var bad = form.querySelector(':invalid');
          if (bad) bad.focus();
          return;
        }
        if (error) error.hidden = true;
        form.hidden = true;
        if (success) {
          success.hidden = false;
          success.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'center'
          });
        }
      });
    }
  });
})();
