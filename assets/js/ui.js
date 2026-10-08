/**
 * Small UI helpers shared by every page: safe HTML templating, formatting, toasts, form errors.
 */
(function () {
  // ---- Safe templating -------------------------------------------------------------------
  // html`<p>${userText}</p>` escapes every interpolated value, so data from the API can never
  // inject markup. Nested html`` results (and arrays of them) are inserted as-is.
  class SafeHtml {
    constructor(value) {
      this.value = value;
    }
    toString() {
      return this.value;
    }
  }

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

  function render(v) {
    if (v === null || v === undefined || v === false) return '';
    if (v instanceof SafeHtml) return v.value;
    if (Array.isArray(v)) return v.map(render).join('');
    return escape(v);
  }

  const raw = (s) => new SafeHtml(String(s));

  function html(strings, ...values) {
    let out = '';
    strings.forEach((s, i) => {
      out += s;
      if (i < values.length) out += render(values[i]);
    });
    return new SafeHtml(out);
  }

  // ---- Formatting ------------------------------------------------------------------------
  const money = (n) => (n === null || n === undefined || isNaN(n) ? '—' : `₦${Number(n).toLocaleString('en-NG')}`);

  const toDate = (d) => (d ? new Date(d) : null);
  const date = (d) =>
    d ? toDate(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const shortDate = (d) => (d ? toDate(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—');
  const time = (d) => (d ? toDate(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—');
  const dateTime = (d) => (d ? `${date(d)}, ${time(d)}` : '—');

  function timeAgo(d) {
    const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'just now';
    const units = [
      ['year', 31536000],
      ['month', 2592000],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
    ];
    for (const [name, secs] of units) {
      const n = Math.floor(s / secs);
      if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  }

  /** Mongo ids are long; show a short human reference like RH-3F9A21. */
  const ref = (id, prefix = 'RH') => (id ? `${prefix}-${String(id).slice(-6).toUpperCase()}` : '—');

  const initials = (name) =>
    (name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');

  function avatar(name, size = 'w-12 h-12 text-base') {
    return html`<span class="${size} inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">${initials(name)}</span>`;
  }

  function stars(rating, cls = 'text-xs') {
    const r = Math.round(Number(rating) || 0);
    return html`<span class="${cls} inline-flex gap-0.5">${[1, 2, 3, 4, 5].map(
      (i) => html`<i class="fa-solid fa-star ${i <= r ? 'text-amber-400' : 'text-slate-200'}"></i>`
    )}</span>`;
  }

  // [pattern, Font Awesome icon, RH.images.devices key] for a category name / item type.
  const DEVICES = [
    [/phone|mobile/, 'fa-mobile-screen-button', 'phone'],
    [/laptop|computer|pc/, 'fa-laptop', 'laptop'],
    [/tele|tv/, 'fa-tv', 'television'],
    [/generat/, 'fa-bolt', 'generator'],
    [/air|ac\b/, 'fa-wind', 'air-conditioner'],
    [/fridge|refrig|freez/, 'fa-snowflake', 'refrigerator'],
    [/wash/, 'fa-soap', 'washing-machine'],
    [/gam|console/, 'fa-gamepad', 'gaming-console'],
    [/print/, 'fa-print', 'printer'],
    [/screen|display/, 'fa-display'],
    [/battery/, 'fa-battery-half'],
    [/software|virus/, 'fa-shield-virus'],
    [/board|chip/, 'fa-microchip'],
  ];
  const deviceMatch = (name) => DEVICES.find(([re]) => re.test(String(name || '').toLowerCase()));

  function deviceIcon(name) {
    const hit = deviceMatch(name);
    return hit ? hit[1] : 'fa-screwdriver-wrench';
  }

  /**
   * An image slot from RH.images: shows `fallback` (an icon) until the file loads, then swaps to the
   * image. A missing file simply leaves the fallback in place. `fallback` must be a single element.
   */
  function slotImage(path, alt, imgClass, fallback) {
    if (!path) return fallback;
    return html`<img src="${RH.url(path)}" alt="${alt}" class="${imgClass}" data-image-slot="${path}" hidden onload="this.hidden=false;var f=this.nextElementSibling;if(f)f.hidden=true" />${fallback}`;
  }

  /**
   * Static pages mark a placeholder with data-slot="<RH.images key>" (and optional data-slot-class).
   * Its first child is the fallback; the image is inserted before it and takes over once it loads.
   */
  function fillSlots(root = document) {
    root.querySelectorAll('[data-slot]').forEach((el) => {
      const path = RH.images && RH.images[el.dataset.slot];
      if (!path || el.querySelector('[data-image-slot]')) return;
      el.insertAdjacentHTML('afterbegin', String(slotImage(path, el.dataset.slotAlt || '', el.dataset.slotClass || 'h-full w-full object-contain', '')));
    });
  }

  function deviceTile(name, size = 'w-16 h-16 text-2xl') {
    const hit = deviceMatch(name);
    const path = hit && hit[2] && RH.images && RH.images.devices[hit[2]];
    return html`<span class="${size} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-brand-600 ring-1 ring-brand-100">${slotImage(
      path,
      name || 'Device',
      'h-full w-full object-contain p-1',
      html`<i class="fa-solid ${deviceIcon(name)}"></i>`
    )}</span>`;
  }

  // ---- Status badges -----------------------------------------------------------------------
  const TONES = {
    blue: 'bg-brand-50 text-brand-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  const STATUS = {
    // repair requests
    open: ['Awaiting quotes', 'amber'],
    quoted: ['Quotes received', 'blue'],
    booked: ['Booked', 'blue'],
    // repair jobs
    accepted: ['Booking confirmed', 'blue'],
    diagnosing: ['Diagnosing', 'blue'],
    awaiting_parts: ['Awaiting parts', 'amber'],
    in_progress: ['In progress', 'blue'],
    quality_check: ['Quality check', 'blue'],
    ready: ['Ready', 'green'],
    on_hold: ['On hold', 'amber'],
    completed: ['Completed', 'green'],
    disputed: ['Disputed', 'red'],
    cancelled: ['Cancelled', 'red'],
    // payments
    unpaid: ['Unpaid', 'amber'],
    held: ['Paid · held in escrow', 'green'],
    released: ['Paid · released', 'green'],
    refunded: ['Refunded', 'slate'],
    cash: ['Pay on delivery', 'amber'],
    cash_settled: ['Paid in cash', 'green'],
    // warranty claims
    resolved: ['Resolved', 'green'],
    rejected: ['Rejected', 'red'],
  };

  const statusLabel = (s) => (STATUS[s] ? STATUS[s][0] : String(s || '').replace(/_/g, ' '));

  function badge(status, labelOverride) {
    const [label, tone] = STATUS[status] || [statusLabel(status), 'slate'];
    return html`<span class="badge ${TONES[tone]}"><span class="h-1.5 w-1.5 rounded-full bg-current"></span>${labelOverride || label}</span>`;
  }

  function toneBadge(label, tone = 'slate') {
    return html`<span class="badge ${TONES[tone]}"><span class="h-1.5 w-1.5 rounded-full bg-current"></span>${label}</span>`;
  }

  // ---- Feedback ----------------------------------------------------------------------------
  function toast(message, type = 'info') {
    let host = document.getElementById('rh-toasts');
    if (!host) {
      host = document.createElement('div');
      host.id = 'rh-toasts';
      host.className = 'fixed inset-x-4 top-4 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    const styles = {
      success: ['fa-circle-check', 'text-green-600'],
      error: ['fa-circle-exclamation', 'text-red-600'],
      info: ['fa-circle-info', 'text-brand-600'],
    };
    const [icon, color] = styles[type] || styles.info;
    const el = document.createElement('div');
    el.className = 'flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink shadow-lg';
    el.innerHTML = String(html`<i class="fa-solid ${icon} ${color} mt-0.5"></i><p class="flex-1">${message}</p>`);
    host.appendChild(el);
    setTimeout(() => el.remove(), type === 'error' ? 6000 : 4000);
  }

  /** Disable a button and show a spinner while an async action runs. */
  async function withLoading(button, fn, busyText) {
    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = String(html`<i class="fa-solid fa-circle-notch fa-spin"></i> ${busyText || 'Please wait…'}`);
    try {
      return await fn();
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  }

  // ---- Forms -------------------------------------------------------------------------------
  function clearErrors(form) {
    form.querySelectorAll('.field-error[data-generated]').forEach((e) => e.remove());
    form.querySelectorAll('.input-invalid').forEach((e) => e.classList.remove('input-invalid'));
    const banner = form.querySelector('[data-form-error]');
    if (banner) banner.classList.add('hidden');
  }

  function fieldError(form, name, message) {
    const input = form.querySelector(`[name="${name}"]`);
    if (!input) return false;
    input.classList.add('input-invalid');
    const p = document.createElement('p');
    p.className = 'field-error';
    p.dataset.generated = '1';
    p.textContent = message;
    (input.closest('[data-field]') || input).insertAdjacentElement('afterend', p);
    return true;
  }

  /** Show an ApiError on a form: per-field messages where possible, otherwise a banner. */
  function showFormError(form, err) {
    const unplaced = [];
    (err.errors || []).forEach((e) => {
      if (!fieldError(form, e.field, e.message)) unplaced.push(e.message);
    });
    const banner = form.querySelector('[data-form-error]');
    const text = unplaced.length ? unplaced.join('. ') : err.errors && err.errors.length ? '' : err.message;
    if (banner && text) {
      banner.textContent = text;
      banner.classList.remove('hidden');
    } else if (text) {
      toast(text, 'error');
    }
  }

  // ---- Page states -------------------------------------------------------------------------
  const spinner = (text = 'Loading…') =>
    html`<div class="flex items-center justify-center gap-3 py-16 text-sm text-slate-500"><i class="fa-solid fa-circle-notch fa-spin text-brand-600"></i>${text}</div>`;

  function errorState(message, retry) {
    return html`<div class="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"><i class="fa-solid fa-triangle-exclamation"></i></span>
      <p class="max-w-md text-sm text-slate-600">${message}</p>
      ${retry ? html`<button class="btn-outline btn-sm" onclick="location.reload()">Try again</button>` : ''}
    </div>`;
  }

  function emptyState(icon, title, text, action) {
    return html`<div class="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600"><i class="fa-solid ${icon}"></i></span>
      <p class="font-semibold text-ink">${title}</p>
      <p class="max-w-md text-sm text-slate-500">${text}</p>
      ${action || ''}
    </div>`;
  }

  /** Simple modal. Returns { el, close }. `body` is SafeHtml. */
  function modal(title, body, { wide = false } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 z-[90] flex items-end justify-center bg-ink/40 p-4 sm:items-center';
    wrap.innerHTML = String(html`<div role="dialog" aria-modal="true" class="max-h-[90vh] w-full ${wide ? 'max-w-2xl' : 'max-w-md'} overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
      <div class="mb-4 flex items-start justify-between gap-4">
        <h2 class="text-lg font-bold text-ink">${title}</h2>
        <button data-close class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div data-body>${body}</div>
    </div>`);
    const close = () => {
      wrap.remove();
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => e.key === 'Escape' && close();
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap || e.target.closest('[data-close]')) close();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    return { el: wrap, close };
  }

  /** Promise-based confirm dialog. */
  function confirm(title, message, { confirmText = 'Confirm', danger = false } = {}) {
    return new Promise((resolve) => {
      const m = modal(
        title,
        html`<p class="text-sm text-slate-600">${message}</p>
          <div class="mt-6 flex justify-end gap-3">
            <button data-close class="btn-ghost btn-sm">Cancel</button>
            <button data-ok class="${danger ? 'btn-danger' : 'btn-primary'} btn-sm">${confirmText}</button>
          </div>`
      );
      let answered = false;
      m.el.querySelector('[data-ok]').addEventListener('click', () => {
        answered = true;
        m.close();
        resolve(true);
      });
      const observer = new MutationObserver(() => {
        if (!document.body.contains(m.el)) {
          observer.disconnect();
          if (!answered) resolve(false);
        }
      });
      observer.observe(document.body, { childList: true });
    });
  }

  /** "Page 2 of 5" pager for list endpoints that return meta { page, pages, total }. Buttons carry data-page. */
  function pager(meta) {
    if (!meta || meta.pages <= 1) return '';
    return html`<div class="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
      <span>Page ${meta.page} of ${meta.pages} · ${meta.total} total</span>
      <span class="flex gap-2">
        <button data-page="${meta.page - 1}" class="btn-outline btn-sm" ${meta.page <= 1 ? raw('disabled') : ''}><i class="fa-solid fa-chevron-left"></i>Previous</button>
        <button data-page="${meta.page + 1}" class="btn-outline btn-sm" ${meta.page >= meta.pages ? raw('disabled') : ''}>Next<i class="fa-solid fa-chevron-right"></i></button>
      </span>
    </div>`;
  }

  function setHTML(el, content) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.innerHTML = render(content); // arrays are joined without commas
  }

  RH.ui = {
    html,
    raw,
    pager,
    escape,
    money,
    date,
    shortDate,
    time,
    dateTime,
    timeAgo,
    ref,
    initials,
    avatar,
    stars,
    deviceIcon,
    slotImage,
    fillSlots,
    deviceTile,
    badge,
    toneBadge,
    statusLabel,
    toast,
    withLoading,
    clearErrors,
    fieldError,
    showFormError,
    spinner,
    errorState,
    emptyState,
    modal,
    confirm,
    setHTML,
  };
})();
