/**
 * Site-wide animations with Motion (motion.dev, the vanilla-JS version of Framer Motion).
 *
 * Pages render most of their content after API calls, so instead of wiring animations into each
 * page this file watches the DOM and animates things as they appear:
 *   - page content fades/slides in; sidebar links stagger in
 *   - cards and list rows rise in with a stagger
 *   - dialogs spring open, toasts slide in, dropdown menus drop down
 *   - progress bars grow, money / stat numbers count up
 *   - [data-celebrate] elements pop with a confetti burst (success pages)
 *   - device tiles on the login panel float
 * Everything is skipped for people who ask their OS for reduced motion, or if the CDN fails.
 * Load after config.js and before ui.js / layout.js so the observer is ready when the shell mounts.
 */
(function () {
  const M = window.Motion;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!M || reduce) return;
  const { animate, stagger } = M;

  const EASE = [0.22, 1, 0.36, 1]; // soft "ease-out-quint"
  const SPRING = { type: 'spring', bounce: 0.3, duration: 0.55 };
  const REVEAL = '.card, .card-soft, article, section.rounded-2xl, #list > li, ul.divide-y > li';
  const MAX_STAGGER = 12;

  const seen = new WeakSet(); // elements already revealed
  const lastBurst = new WeakMap(); // container -> time of last reveal, to calm fast re-renders

  /** Run an animation, then drop the inline styles Motion leaves behind (so CSS hover effects still work). */
  function play(el, keyframes, options, props) {
    const controls = animate(el, keyframes, options);
    const els = Array.isArray(el) ? el : [el];
    Promise.resolve(controls.finished || controls)
      // Motion commits the final keyframe just after `finished` resolves, so clear on the next frame.
      .then(() => setTimeout(() => els.forEach((e) => props.forEach((p) => (e.style[p] = ''))), 50))
      .catch(() => {});
    return controls;
  }

  // ---- 1. Reveal cards / rows as they are inserted -------------------------------------------
  function reveal(elements) {
    const fresh = elements.filter((el) => !seen.has(el) && el.isConnected && !el.closest('[role="dialog"]'));
    if (!fresh.length) return;
    // Don't animate a card that sits inside another card in the same batch.
    const top = fresh.filter((el) => !fresh.some((other) => other !== el && other.contains(el)));
    top.forEach((el) => seen.add(el));

    const parent = top[0].parentElement;
    const now = performance.now();
    const quiet = parent && now - (lastBurst.get(parent) || 0) < 700; // e.g. typing in a search box
    if (parent) lastBurst.set(parent, now);

    const items = top.slice(0, MAX_STAGGER);
    items.forEach((el) => (el.style.opacity = '0'));
    items.forEach((el, i) => {
      play(
        el,
        { opacity: [0, 1], transform: quiet ? ['none', 'none'] : ['translateY(14px)', 'translateY(0px)'] },
        { duration: quiet ? 0.2 : 0.5, delay: quiet ? 0 : i * 0.05, ease: EASE },
        ['opacity', 'transform']
      );
    });
  }

  // ---- 2. Progress bars grow from the left -------------------------------------------------
  function growBars(root) {
    root.querySelectorAll('.h-2 > div[style*="width"]').forEach((bar) => {
      if (seen.has(bar)) return;
      seen.add(bar);
      bar.style.transformOrigin = 'left center';
      play(bar, { transform: ['scaleX(0)', 'scaleX(1)'] }, { duration: 0.9, delay: 0.2, ease: EASE }, ['transform']);
    });
  }

  // ---- 3. Count up money and stat numbers --------------------------------------------------
  const NUMBER = /^(₦?)([\d,]+)$/;
  const STAT = '.text-2xl.font-bold, .text-3xl.font-bold, .text-4xl.font-bold, .text-xl.font-bold';
  const counted = new Set(); // "container|value" pairs already counted, so re-renders don't recount
  const counting = new WeakSet(); // elements mid count-up (their own text updates must not retrigger)
  function countUp(root) {
    const els = [...root.querySelectorAll(STAT)];
    if (root.matches(STAT)) els.push(root);
    els.forEach((el) => {
      // Headline figures only: prices inside list rows (quotes, repairs, transactions) stay still.
      if (counting.has(el) || el.children.length || el.closest('article, li')) return;
      const m = el.textContent.trim().match(NUMBER);
      if (!m) return;
      const key = `${(el.closest('[id]') || {}).id || ''}|${m[0]}`;
      if (counted.has(key)) return;
      counted.add(key);
      const target = Number(m[2].replace(/,/g, ''));
      if (!target || target > 1e9) return;
      counting.add(el);
      const final = el.textContent;
      el.textContent = `${m[1]}0`; // start from zero right away so the final value never flashes first
      animate(0, target, {
        duration: Math.min(0.6 + target / 200000, 1.2),
        ease: EASE,
        onUpdate: (v) => (el.textContent = m[1] + Math.round(v).toLocaleString('en-NG')),
        onComplete: () => {
          el.textContent = final;
          setTimeout(() => counting.delete(el), 0);
        },
      });
    });
  }

  // ---- 4. Dialogs and toasts ---------------------------------------------------------------
  function openDialog(backdrop) {
    const dialog = backdrop.querySelector('[role="dialog"]');
    play(backdrop, { opacity: [0, 1] }, { duration: 0.2 }, ['opacity']);
    if (dialog) play(dialog, { opacity: [0, 1], transform: ['translateY(18px) scale(0.97)', 'translateY(0px) scale(1)'] }, SPRING, ['opacity', 'transform']);
  }

  function showToast(el) {
    play(el, { opacity: [0, 1], transform: ['translateX(24px) scale(0.98)', 'translateX(0px) scale(1)'] }, SPRING, ['opacity', 'transform']);
  }

  // ---- 5. Celebration: pop + confetti ------------------------------------------------------
  const COLORS = ['#2563eb', '#3b6ff6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];
  function confetti(target) {
    const r = target.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    for (let i = 0; i < 36; i++) {
      const piece = document.createElement('span');
      const size = 6 + Math.random() * 6;
      piece.setAttribute('aria-hidden', 'true');
      Object.assign(piece.style, {
        position: 'fixed', left: `${cx}px`, top: `${cy}px`, width: `${size}px`, height: `${size * 0.6}px`,
        background: COLORS[i % COLORS.length], borderRadius: '2px', pointerEvents: 'none', zIndex: 80,
      });
      document.body.appendChild(piece);
      const angle = (Math.PI * 2 * i) / 36 + Math.random() * 0.4;
      const dist = 90 + Math.random() * 120;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 40;
      const spin = (Math.random() - 0.5) * 720;
      Promise.resolve(
        animate(piece, {
          transform: ['translate(-50%, -50%) rotate(0deg)', `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 80}px)) rotate(${spin}deg)`],
          opacity: [1, 1, 0],
        }, { duration: 1.1 + Math.random() * 0.5, ease: [0.16, 1, 0.3, 1] }).finished
      ).then(() => piece.remove());
    }
  }

  function celebrate(el) {
    if (seen.has(el)) return;
    seen.add(el);
    play(el, { transform: ['scale(0.4)', 'scale(1)'], opacity: [0, 1] }, { type: 'spring', bounce: 0.55, duration: 0.7 }, ['transform', 'opacity']);
    setTimeout(() => confetti(el), 180);
  }

  // ---- 6. Things to do when new nodes arrive ----------------------------------------------
  function handle(root) {
    if (!(root instanceof Element)) return;
    if (root.id === 'rh-toasts') return; // the container itself; its children are handled below
    if (root.parentElement && root.parentElement.id === 'rh-toasts') return showToast(root);
    if (root.querySelector && root.matches('div.fixed.inset-0') && root.querySelector('[role="dialog"]')) return openDialog(root);

    if (root.id === 'page-content') {
      play(root, { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)'] }, { duration: 0.45, ease: EASE }, ['opacity', 'transform']);
      const links = root.ownerDocument.querySelectorAll('#rh-sidebar nav a');
      if (links.length) play([...links], { opacity: [0, 1], transform: ['translateX(-10px)', 'translateX(0px)'] }, { duration: 0.35, delay: stagger(0.04), ease: EASE }, ['opacity', 'transform']);
    }

    const cards = root.matches(REVEAL) ? [root] : [];
    cards.push(...root.querySelectorAll(REVEAL));
    if (cards.length) reveal(cards);
    growBars(root);
    countUp(root);
    const party = root.matches('[data-celebrate]') ? root : root.querySelector('[data-celebrate]');
    if (party) celebrate(party);
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(handle);
        // A number written into an existing element (e.g. the wallet balance) counts up too.
        if (m.target instanceof Element && [...m.addedNodes].some((n) => n.nodeType === 3)) countUp(m.target);
      }
      else if (m.type === 'attributes' && m.target.matches('#rh-notif-panel, #rh-user-panel') && !m.target.classList.contains('hidden')) {
        play(m.target, { opacity: [0, 1], transform: ['translateY(-6px) scale(0.98)', 'translateY(0px) scale(1)'] }, { duration: 0.22, ease: EASE }, ['opacity', 'transform']);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  // ---- 7. Static pages (login, sign-up, role) -----------------------------------------------
  function intro() {
    const main = document.querySelector('body > div > main, body > main:not(#page-content)');
    if (main && !document.getElementById('page-content')) {
      const blocks = [...main.querySelectorAll(':scope > header, :scope > div > *')].slice(0, 10);
      if (blocks.length) play(blocks, { opacity: [0, 1], transform: ['translateY(12px)', 'translateY(0px)'] }, { duration: 0.5, delay: stagger(0.06), ease: EASE }, ['opacity', 'transform']);
    }
    handle(document.body);
    // Gentle floating for the device tiles on the auth panel.
    document.querySelectorAll('#auth-hero .grid > div').forEach((tile, i) => {
      animate(tile, { transform: ['translateY(0px)', 'translateY(-7px)', 'translateY(0px)'] }, { duration: 3.2 + (i % 3) * 0.4, delay: i * 0.25, repeat: Infinity, ease: 'easeInOut' });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', intro);
  else setTimeout(intro, 0);
})();
