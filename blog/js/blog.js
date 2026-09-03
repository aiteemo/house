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

  // Multi-tag filter on posts list (?tag=装修)
  const postList = document.querySelector('[data-post-list]');
  const tagFilter = document.querySelector('[data-tag-filter]');
  if (postList) {
    const rows = Array.from(postList.querySelectorAll('[data-tags]'));
    const emptyEl = document.querySelector('[data-tag-empty]');
    const parseTags = (el) =>
      (el.getAttribute('data-tags') || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

    const allTags = [];
    rows.forEach((row) => {
      parseTags(row).forEach((tag) => {
        if (allTags.indexOf(tag) === -1) allTags.push(tag);
      });
    });

    const activeTag = new URLSearchParams(location.search).get('tag') || '';

    if (tagFilter) {
      const frag = document.createDocumentFragment();
      const makeChip = (label, tag) => {
        const a = document.createElement('a');
        a.className = 'tag-chip' + ((tag === activeTag) || (!tag && !activeTag) ? ' is-active' : '');
        a.href = tag ? ('?tag=' + encodeURIComponent(tag)) : 'index.html';
        a.textContent = label;
        a.setAttribute('data-tag-value', tag);
        return a;
      };
      frag.appendChild(makeChip('全部', ''));
      allTags.forEach((tag) => frag.appendChild(makeChip(tag, tag)));
      tagFilter.appendChild(frag);
    }

    let visible = 0;
    rows.forEach((row) => {
      const tags = parseTags(row);
      const show = !activeTag || tags.indexOf(activeTag) !== -1;
      row.hidden = !show;
      if (show) visible += 1;
    });
    if (emptyEl) emptyEl.hidden = visible > 0;
  }

  // Page background music: <div class="bgm-dock" data-bgm data-bgm-src="..." data-bgm-title="...">
  const bgmHost = document.querySelector('[data-bgm]');
  if (bgmHost) {
    const src = bgmHost.getAttribute('data-bgm-src');
    const title = bgmHost.getAttribute('data-bgm-title') || '背景音乐';
    if (src) {
      const audio = document.createElement('audio');
      audio.setAttribute('loop', '');
      audio.setAttribute('preload', 'metadata');
      audio.src = src;
      audio.volume = 0.38;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bgm-toggle';
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML =
        '<span class="bgm-toggle__wave" aria-hidden="true"></span>' +
        '<span class="bgm-toggle__copy">' +
        '<span class="bgm-toggle__state">开启音乐</span>' +
        '<span class="bgm-toggle__title"></span>' +
        '</span>';
      btn.querySelector('.bgm-toggle__title').textContent = title;

      bgmHost.appendChild(audio);
      bgmHost.appendChild(btn);

      const storageKey = 'aiteemo-bgm:' + location.pathname;
      let wantOn = sessionStorage.getItem(storageKey) !== 'off';

      const setUi = (playing) => {
        btn.classList.toggle('is-on', playing);
        btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
        btn.setAttribute('aria-label', playing ? '暂停背景音乐' : '播放背景音乐');
        btn.querySelector('.bgm-toggle__state').textContent = playing ? '播放中' : '开启音乐';
      };

      const play = () =>
        audio.play().then(() => {
          wantOn = true;
          sessionStorage.setItem(storageKey, 'on');
          setUi(true);
        }).catch(() => setUi(false));

      const pause = () => {
        audio.pause();
        wantOn = false;
        sessionStorage.setItem(storageKey, 'off');
        setUi(false);
      };

      btn.addEventListener('click', () => {
        if (audio.paused) play();
        else pause();
      });

      // Browsers block autoplay with sound; resume after first gesture if user wants on
      if (wantOn) {
        play();
        const unlock = () => {
          if (wantOn && audio.paused) play();
        };
        document.addEventListener('pointerdown', unlock, { once: true, passive: true });
        document.addEventListener('keydown', unlock, { once: true });
      } else {
        setUi(false);
      }
    }
  }
})();
