(function () {
  const user = RH.layout.app({ active: 'repairs' });
  if (!user) return;
  const { html, setHTML } = RH.ui;
  const requestId = RH.param('request');
  let request = null;
  let quotes = [];

  const days = (n) => (n === undefined || n === null ? '—' : n === 0 ? 'Same day' : `${n} day${n === 1 ? '' : 's'}`);
  const warranty = (d) => (d ? `${d}-day warranty` : 'No warranty');

  function techMeta(t) {
    if (!t) return '';
    return html`<span class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
      <span><i class="fa-solid fa-star text-amber-400"></i> <b class="text-ink">${t.ratingAvg ? t.ratingAvg.toFixed(1) : 'New'}</b> ${t.ratingCount ? `(${t.ratingCount} reviews)` : ''}</span>
      <span>· ${t.jobsCompleted || 0} jobs completed</span>
      ${t.serviceAreas && t.serviceAreas.length ? html`<span>· <i class="fa-solid fa-location-dot"></i> ${t.serviceAreas.join(', ')}</span>` : ''}
    </span>`;
  }

  function card(q) {
    const t = q.technicianId || {};
    const name = RH.data.techName(t);
    const accepted = q.status === 'accepted';
    const locked = request.status !== 'open' && request.status !== 'quoted';
    return html`<article class="card p-5 ${q.bestValue && !locked ? 'border-2 border-brand-600' : ''} ${accepted ? 'border-2 border-green-500' : ''}">
      <div class="flex flex-wrap gap-2">
        ${accepted ? RH.ui.toneBadge('Selected', 'green') : ''}
        ${q.bestValue && !accepted ? html`<span class="badge bg-brand-600 text-white"><i class="fa-solid fa-circle-check"></i>Best value</span>` : ''}
        <span class="badge bg-brand-50 text-brand-700"><i class="fa-solid fa-shield-halved"></i>Verified</span>
        ${q.serviceCenterId && q.serviceCenterId.businessName ? html`<span class="badge bg-slate-100 text-slate-600"><i class="fa-solid fa-store"></i>${q.serviceCenterId.businessName}</span>` : ''}
      </div>
      <div class="mt-3 grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
        <div class="flex items-center gap-3">
          ${RH.ui.avatar(name)}
          <div class="min-w-0"><p class="font-semibold text-ink">${name}</p>${techMeta(t)}</div>
        </div>
        <div class="space-y-2 text-sm">
          <p class="flex items-center gap-2"><i class="fa-solid fa-shield-halved w-4 text-brand-600"></i><span><b class="text-ink">${warranty(q.warrantyDays)}</b></span></p>
          <p class="flex items-center gap-2"><i class="fa-regular fa-clock w-4 text-brand-600"></i><span><b class="text-ink">${days(q.estimatedDays)}</b> <span class="text-slate-500">estimated</span></span></p>
        </div>
        <div class="md:text-right">
          <p class="text-2xl font-bold text-brand-600">${RH.ui.money(q.price)}</p>
          ${q.laborCost || q.partsCost ? html`<p class="text-xs text-slate-500">Labour ${RH.ui.money(q.laborCost)} · Parts ${RH.ui.money(q.partsCost)}</p>` : ''}
          ${q.expiresAt && !accepted ? html`<p class="text-xs text-slate-400">Valid until ${RH.ui.shortDate(q.expiresAt)}</p>` : ''}
        </div>
      </div>
      ${q.notes ? html`<p class="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><i class="fa-regular fa-comment mr-1 text-slate-400"></i>${q.notes}</p>` : ''}
      <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button data-profile="${t._id}" class="btn-outline btn-sm">View profile</button>
        ${accepted
          ? html`<a href="${RH.url('customer/book.html', { request: request._id, quote: q._id })}" class="btn-primary btn-sm">Book appointment <i class="fa-solid fa-arrow-right"></i></a>`
          : locked
          ? ''
          : html`<button data-accept="${q._id}" class="btn-primary btn-sm">Select technician</button>`}
      </div>
    </article>`;
  }

  function renderList() {
    document.getElementById('count').textContent = quotes.length
      ? `${quotes.length} technician${quotes.length === 1 ? '' : 's'} responded to your request`
      : 'Waiting for technicians to respond';

    const accepted = quotes.find((q) => q.status === 'accepted');
    setHTML(
      'banner',
      accepted
        ? html`<div class="flex flex-col gap-3 rounded-2xl bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-green-800"><i class="fa-solid fa-circle-check mr-1"></i>You selected <b>${RH.data.techName(accepted.technicianId)}</b>. Book an appointment to continue.</p>
            <a href="${RH.url('customer/book.html', { request: request._id, quote: accepted._id })}" class="btn-primary btn-sm">Book appointment</a>
          </div>`
        : request.status === 'cancelled'
        ? html`<p class="rounded-2xl bg-red-50 p-4 text-sm text-red-700">This request was cancelled.</p>`
        : ''
    );

    if (!quotes.length) {
      setHTML('list', RH.ui.emptyState('fa-hourglass-half', 'No quotations yet', "Technicians in your area are reviewing your request. We'll notify you as soon as a quotation arrives."));
      return;
    }
    setHTML('list', quotes.map(card));
    document.querySelectorAll('[data-accept]').forEach((b) => b.addEventListener('click', () => accept(b)));
    document.querySelectorAll('[data-profile]').forEach((b) => b.addEventListener('click', () => showProfile(b.dataset.profile)));
  }

  async function accept(btn) {
    const q = quotes.find((x) => x._id === btn.dataset.accept);
    const name = RH.data.techName(q.technicianId);
    const yes = await RH.ui.confirm(
      `Select ${name}?`,
      `You're accepting a quotation of ${RH.ui.money(q.price)}. Other quotations for this request will be declined.`,
      { confirmText: 'Select technician' }
    );
    if (!yes) return;
    await RH.ui.withLoading(btn, async () => {
      try {
        await RH.api.quotations.accept(q._id);
        RH.flash(`${name} selected. Now choose a date and time.`);
        RH.go('customer/book.html', { request: request._id, quote: q._id });
      } catch (e) {
        RH.ui.toast(e.message, 'error');
        load();
      }
    }, 'Selecting…');
  }

  async function showProfile(techId) {
    const m = RH.ui.modal('Technician profile', RH.ui.spinner(), { wide: true });
    const body = m.el.querySelector('[data-body]');
    try {
      const [t, reviews] = await Promise.all([
        RH.data.technician(techId),
        RH.api.reviews.forTechnician(techId, { limit: 5 }).then((r) => r.data).catch(() => []),
      ]);
      if (!t) throw new Error('This technician profile is not available.');
      const name = RH.data.techName(t);
      setHTML(body, html`<div class="flex items-center gap-4">${RH.ui.avatar(name, 'w-16 h-16 text-xl')}
          <div><p class="text-lg font-semibold text-ink">${name} <i class="fa-solid fa-circle-check text-brand-600"></i></p>${techMeta(t)}</div></div>
        <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-xl bg-slate-50 p-3"><p class="text-xs text-slate-500">Experience</p><p class="font-semibold text-ink">${t.experienceYears ? `${t.experienceYears} years` : '—'}</p></div>
          <div class="rounded-xl bg-slate-50 p-3"><p class="text-xs text-slate-500">Availability</p><p class="font-semibold text-ink">${t.isAvailable ? 'Available' : 'Busy'}</p></div>
        </div>
        ${t.bio ? html`<p class="mt-4 text-sm text-slate-600">${t.bio}</p>` : ''}
        <h3 class="mt-6 font-semibold text-ink">Recent reviews</h3>
        ${reviews.length
          ? html`<ul class="mt-2 divide-y divide-slate-100">${reviews.map(
              (r) => html`<li class="py-3">${RH.ui.stars(r.rating)}
                ${r.comment ? html`<p class="mt-1 text-sm text-slate-600">${r.comment}</p>` : ''}
                ${r.tags && r.tags.length ? html`<p class="mt-1 flex flex-wrap gap-1">${r.tags.map((tag) => html`<span class="badge bg-brand-50 text-brand-700">${tag}</span>`)}</p>` : ''}
                <p class="mt-1 text-xs text-slate-400">${RH.ui.date(r.createdAt)}</p></li>`
            )}</ul>`
          : html`<p class="mt-2 text-sm text-slate-500">No reviews yet.</p>`}`);
    } catch (e) {
      setHTML(body, html`<p class="text-sm text-slate-600">${e.message}</p>`);
    }
  }

  function renderRequest() {
    const cat = request.serviceCategoryId && request.serviceCategoryId.name;
    const kv = (k, v) => html`<div class="flex justify-between gap-4 py-2 text-sm"><span class="text-slate-500">${k}</span><span class="text-right font-medium text-ink">${v || '—'}</span></div>`;
    const cancellable = ['open', 'quoted'].includes(request.status);
    setHTML('request', html`<div class="flex items-center gap-3 rounded-xl bg-brand-50 p-3">${RH.ui.deviceTile(request.itemType || cat, 'w-11 h-11 text-lg')}
        <div><p class="text-sm font-semibold text-ink">${RH.data.requestTitle(request)}</p><p class="text-xs text-slate-500">${request.brandModel || cat || ''}</p></div></div>
      <div class="mt-3 divide-y divide-slate-100">
        ${kv('Request ID', RH.ui.ref(request._id))}
        ${kv('Category', cat)}
        ${kv('Address', request.address)}
        ${kv('Status', RH.ui.statusLabel(request.status))}
      </div>
      <p class="mt-3 text-xs text-slate-500">Problem</p>
      <p class="text-sm text-slate-700">${request.problemDescription}</p>
      ${cancellable ? html`<button id="cancel-req" class="btn-danger btn-sm mt-4 w-full">Cancel request</button>` : ''}`);
    const cancel = document.getElementById('cancel-req');
    if (cancel) {
      cancel.addEventListener('click', async () => {
        const yes = await RH.ui.confirm('Cancel this request?', 'Technicians will no longer be able to send quotations for it.', { confirmText: 'Cancel request', danger: true });
        if (!yes) return;
        await RH.ui.withLoading(cancel, async () => {
          try {
            await RH.api.repairRequests.cancel(request._id);
            RH.ui.toast('Repair request cancelled.', 'success');
            load();
          } catch (e) {
            RH.ui.toast(e.message, 'error');
          }
        });
      });
    }
  }

  async function load() {
    if (!requestId) {
      setHTML('list', RH.ui.errorState('No repair request was specified.'));
      return;
    }
    setHTML('list', RH.ui.spinner());
    try {
      const [r, q] = await Promise.all([
        RH.api.repairRequests.get(requestId),
        RH.api.quotations.forRequest(requestId, document.getElementById('sort').value),
      ]);
      request = r.data;
      quotes = q.data || [];
      renderRequest();
      renderList();
    } catch (e) {
      setHTML('list', RH.ui.errorState(e.message, true));
    }
  }

  document.getElementById('sort').addEventListener('change', load);
  load();
})();
