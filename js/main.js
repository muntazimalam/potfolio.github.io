/* ============================================================
   Muntazim Alam — Portfolio 2026 scripts
   Animations, nav, filters, GitHub badges, contact form
   ============================================================ */

(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- API endpoint ---------------- */
  // Local development targets the local FastAPI backend; the deployed site
  // talks to the Render-hosted API. Keep ALLOWED_ORIGINS in sync on the backend.
  const LOCAL_HOSTS = ['localhost', '127.0.0.1'];
  const API_BASE = LOCAL_HOSTS.includes(window.location.hostname)
    ? 'http://localhost:8000'
    : 'https://muntazim-portfolio-api.onrender.com';

  /* ---------------- Preloader ---------------- */

  const preloader = document.getElementById('preloader');
  const hidePreloader = () => preloader && preloader.classList.add('done');

  if (reducedMotion) {
    hidePreloader();
  } else {
    const minShown = 900;
    const startedAt = performance.now();
    window.addEventListener('load', () => {
      const wait = Math.max(0, minShown - (performance.now() - startedAt));
      setTimeout(hidePreloader, wait);
    });
    setTimeout(hidePreloader, 4500); // safety net
  }

  /* ---------------- Scroll progress + navbar state ---------------- */

  const progress = document.getElementById('scrollProgress');
  const navbar = document.getElementById('navbar');

  const onScroll = () => {
    const doc = document.documentElement;
    const scrolled = doc.scrollTop;
    const max = doc.scrollHeight - doc.clientHeight;
    if (progress) progress.style.width = `${max > 0 ? (scrolled / max) * 100 : 0}%`;
    navbar && navbar.classList.toggle('scrolled', scrolled > 40);
    const btt = document.getElementById('backToTop');
    if (btt) btt.classList.toggle('show', scrolled > 560);
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  document.getElementById('backToTop')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  });

  /* ---------------- Custom cursor ---------------- */

  if (window.matchMedia('(pointer: fine)').matches && !reducedMotion) {
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = `${mx}px`;
      dot.style.top = `${my}px`;
    });

    (function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.left = `${rx}px`;
      ring.style.top = `${ry}px`;
      requestAnimationFrame(loop);
    })();

    document.addEventListener('mouseover', (e) => {
      const grow = e.target.closest('a, button, .filter-chip, input, select, textarea, .project-card, .skill-tile');
      ring.classList.toggle('grow', !!grow);
    });

    document.addEventListener('mouseleave', () => {
      dot.style.opacity = ring.style.opacity = 0;
    });
    document.addEventListener('mouseenter', () => {
      dot.style.opacity = ring.style.opacity = 1;
    });
  }

  /* ---------------- Particle background ---------------- */

  if (!reducedMotion) {
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];

    const resize = () => {
      W = canvas.width = innerWidth;
      H = canvas.height = innerHeight;
    };
    resize();
    addEventListener('resize', resize);

    const COUNT = Math.min(70, Math.floor(innerWidth / 22));
    particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -(Math.random() * 0.3 + 0.05),
      a: Math.random() * 0.5 + 0.12,
      tw: Math.random() * Math.PI * 2,
    }));

    const draw = (t) => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.tw += 0.02;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        const alpha = p.a * (0.6 + 0.4 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(198, 169, 114, ${alpha.toFixed(3)})`;
        ctx.fill();
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  /* ---------------- Split-letter reveal ---------------- */

  const splitTexts = document.querySelectorAll('[data-split]');
  splitTexts.forEach((el) => {
    const text = el.textContent.trim();
    el.textContent = '';
    text.split(' ').forEach((word, wi) => {
      const wSpan = document.createElement('span');
      wSpan.className = 'split-word';
      word.split('').forEach((ch) => {
        const c = document.createElement('span');
        c.className = 'split-char';
        c.textContent = ch;
        wSpan.appendChild(c);
      });
      if (wi < text.split(' ').length - 1) wSpan.appendChild(document.createTextNode('\u00A0'));
      el.appendChild(wSpan);
    });
  });

  /* ---------------- Intersection observer: reveals + counters + bars ---------------- */

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('visible');

      if (el.classList.contains('split-char')) {
        // handled by hero triggers below
      } else if (el.matches('[data-split]') && !reducedMotion) {
        el.querySelectorAll('.split-char').forEach((c, i) => {
          setTimeout(() => c.classList.add('in'), 120 + i * 28);
        });
      }

      if (el.matches('[data-counter]')) {
        animateCounter(el);
      }
      if (el.id === 'skills') {
        el.querySelectorAll('.bar-fill').forEach((bar) => {
          const w = bar.dataset.width;
          setTimeout(() => { bar.style.width = w; }, 200);
        });
      }
      io.unobserve(el);
    });
  }, { threshold: 0.15 });

  const revealEls = document.querySelectorAll('.reveal, [data-split], [data-counter]');
  revealEls.forEach((el) => io.observe(el));

  // Hero name letters animate right after preloader (or immediately if no preloader)
  const heroName = document.getElementById('heroName');
  if (heroName) {
    const fire = () => {
      heroName.querySelectorAll('.split-char').forEach((c, i) => {
        setTimeout(() => c.classList.add('in'), 350 + i * 30);
      });
    };
    if (reducedMotion) {
      heroName.querySelectorAll('.split-char').forEach((c) => c.classList.add('in'));
    } else {
      setTimeout(fire, 500);
    }
  }

  function animateCounter(el) {
    const target = parseInt(el.dataset.counter, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1500;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------------- Typing effect ---------------- */

  const typedEl = document.getElementById('typed');
  if (typedEl) {
    const roles = ['Cloud Computing', 'IoT Engineering', 'AI Solutions', 'Web Experiences'];
    let roleIdx = 0, charIdx = 0, deleting = false;

    const tick = () => {
      const role = roles[roleIdx];
      typedEl.textContent = role.slice(0, charIdx);
      let delay = deleting ? 45 : 95;

      if (!deleting && charIdx === role.length) {
        deleting = true;
        delay = 1900;
      } else if (deleting && charIdx === 0) {
        deleting = false;
        roleIdx = (roleIdx + 1) % roles.length;
        delay = 350;
      }
      charIdx += deleting ? -1 : 1;
      setTimeout(tick, delay);
    };
    if (reducedMotion) {
      typedEl.textContent = roles[0];
    } else {
      setTimeout(tick, 2200);
    }
  }

  /* ---------------- Navbar active section spy ---------------- */

  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: '-42% 0px -52% 0px' });
  sections.forEach((s) => spy.observe(s));

  /* ---------------- Mobile menu ---------------- */

  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  const toggleMenu = (open) => {
    menuBtn.classList.toggle('open', open);
    mobileMenu.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };

  menuBtn?.addEventListener('click', () => toggleMenu(!mobileMenu.classList.contains('open')));
  mobileMenu?.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => toggleMenu(false))
  );

  /* ---------------- Project filters ---------------- */

  const filterBtns = document.querySelectorAll('.filter-chip[data-filter]');
  const cards = document.querySelectorAll('.project-card');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      cards.forEach((card) => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('hide', !show);
        if (show && !card.classList.contains('fade-in')) {
          card.classList.remove('fade-in');
          void card.offsetWidth;
          card.classList.add('fade-in');
        }
      });
    });
  });

  /* ---------------- Card spotlight tilt ---------------- */

  if (!reducedMotion) {
    document.querySelectorAll('.project-card, .skill-tile').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
        card.style.setProperty('--y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
      });
    });
  }

  /* ---------------- GitHub repo stats ---------------- */

  const STAR_CACHE_KEY = 'repoStatsCache.v1';
  const STAR_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  function getCachedStats() {
    try {
      const raw = localStorage.getItem(STAR_CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.ts > STAR_CACHE_TTL) return null;
      return data.repos;
    } catch { return null; }
  }

  async function fetchRepoStats() {
    const cached = getCachedStats();
    const repoSpans = document.querySelectorAll('.repo-stats');
    if (cached) {
      repoSpans.forEach((span) => renderStats(span, cached));
      return;
    }
    const repos = [];
    for (const span of repoSpans) {
      const fullName = span.dataset.repo;
      try {
        const res = await fetch(`https://api.github.com/repos/${fullName}`, {
          headers: { Accept: 'application/vnd.github+json' },
        });
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        repos.push({ name: fullName, stars: data.stargazers_count, forks: data.forks_count });
        renderStats(span, { [fullName]: { stars: data.stargazers_count, forks: data.forks_count } });
      } catch {
        span.remove();
      }
    }
    if (repos.length) {
      try {
        const merged = {};
        repos.forEach((r) => (merged[r.name] = { stars: r.stars, forks: r.forks }));
        localStorage.setItem(STAR_CACHE_KEY, JSON.stringify({ ts: Date.now(), repos: merged }));
      } catch { /* storage unavailable */ }
    }
  }

  function renderStats(span, statsMap) {
    const s = statsMap[span.dataset.repo];
    if (!s || s.stars === undefined) return;
    span.innerHTML =
      `<span class="star">★</span><b>${s.stars}</b>` +
      `<span aria-hidden="true">·</span>` +
      `<span>${s.forks} forks</span>`;
  }

  fetchRepoStats();

  /* ---------------- Contact form ---------------- */

  const form = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');
  const status = document.getElementById('formStatus');

  function setStatus(kind, message, withSpinner = false) {
    status.className = `form-status ${kind}`;
    status.innerHTML = withSpinner
      ? `<span class="spinner" aria-hidden="true"></span><span>${message}</span>`
      : `<span>${message}</span>`;
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return;

    const payload = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      contact: document.getElementById('contact').value.trim(),
      reason: document.getElementById('reason').value,
      message: document.getElementById('message').value.trim(),
      website: document.getElementById('website').value.trim(), // honeypot
    };

    if (!payload.name || !payload.email || !payload.reason) {
      setStatus('error', 'Please complete the required fields before submitting.');
      return;
    }

    submitBtn.disabled = true;
    setStatus('info', 'Submitting securely…', true);

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        form.reset();
        document.getElementById('reason').value = ''; // reset placeholder state
        const msg = data.emailed
          ? 'Submitted — your message was saved and emailed to me.'
          : 'Submitted — your message was saved. (Email notification is being configured.)';
        setStatus('success', msg);
        gaEvent('contact_submit', msg);
      } else {
        setStatus('error', 'Something went wrong on the server. Please try again in a moment.');
      }
    } catch {
      setStatus('error', 'Could not reach the server — your browser cannot send emails on its own. Is the backend API running?');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Lightweight analytics hook (no-op if Google Analytics absent)
  window.gaEvent = window.gaEvent || function () { };

  /* ---------------- Footer year ---------------- */

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();