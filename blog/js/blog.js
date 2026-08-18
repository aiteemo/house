(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Sticky nav
  const nav = document.querySelector('.site-nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Mobile menu
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Reveal on load + scroll
  const reveals = document.querySelectorAll('.reveal');
  if (reduce) {
    reveals.forEach(el => el.classList.add('is-in'));
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
    // Hero items should animate in immediately
    requestAnimationFrame(() => {
      document.querySelectorAll('.hero .reveal').forEach(el => el.classList.add('is-in'));
    });
  } else {
    reveals.forEach(el => el.classList.add('is-in'));
  }

  // Soft cursor glow (desktop pointer only)
  const glow = document.getElementById('cursor-glow');
  if (glow && !reduce && window.matchMedia('(pointer: fine)').matches) {
    document.body.classList.add('has-pointer');
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const tick = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      glow.style.left = x + 'px';
      glow.style.top = y + 'px';
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
  }
})();
