(function () {
  const user = RH.layout.app({ active: 'repairs' });
  if (!user) return;
  const { html, setHTML } = RH.ui;
  const requestId = RH.param('request');
  const quoteId = RH.param('quote');
  document.getElementById('back-link').href = RH.url('customer/quotations.html', { request: requestId });

  const HOURS = [8, 10, 12, 14, 16];
  const DAYS_AHEAD = 14;
  const VISIBLE_DAYS = 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => new Date(today.getTime() + i * 86400000));

  const state = { request: null, quote: null, tech: null, day: null, hour: null, mode: 'onsite', offset: 0 };

  const slotInPast = (day, hour) => {
    const d = new Date(day);
    d.setHours(hour, 0, 0, 0);
    return d.getTime() <= Date.now() + 30 * 60000; // at least 30 minutes from now
  };
  const dayHasSlots = (day) => HOURS.some((h) => !slotInPast(day, h));
  const hourLabel = (h) => new Date(2000, 0, 1, h).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  function stepHeader(n, icon, title, hint) {
    return html`<div class="flex items-start gap-3">
      <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><i class="fa-solid ${icon}"></i></span>
      <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white">${n}</span>
      <div><h2 class="font-semibold text-ink">${title}</h2><p class="text-sm text-slate-500">${hint}</p></div>
    </div>`;
  }

  function renderDates() {
    const visible = days.slice(state.offset, state.offset + VISIBLE_DAYS);
    setHTML('dates', html`
      <button type="button" data-shift="-1" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40" ${state.offset === 0 ? RH.ui.raw('disabled') : ''} aria-label="Earlier dates"><i class="fa-solid fa-chevron-left"></i></button>
      <div class="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
        ${visible.map((d) => {
          const selected = state.day && state.day.getTime() === d.getTime();
          const disabled = !dayHasSlots(d);
          return html`<button type="button" data-day="${d.getTime()}" ${disabled ? RH.ui.raw('disabled') : ''} class="min-w-[4.5rem] flex-1 rounded-xl border px-2 py-3 text-center text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
            selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 text-ink hover:border-brand-200'
          }">
            <span class="block ${selected ? 'text-brand-100' : 'text-slate-500'}">${d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
            <span class="block font-semibold">${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}</span>
          </button>`;
        })}
      </div>
      <button type="button" data-shift="1" class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40" ${state.offset + VISIBLE_DAYS >= DAYS_AHEAD ? RH.ui.raw('disabled') : ''} aria-label="Later dates"><i class="fa-solid fa-chevron-right"></i></button>`);

    document.querySelectorAll('[data-shift]').forEach((b) =>
      b.addEventListener('click', () => {
        state.offset = Math.min(Math.max(state.offset + Number(b.dataset.shift) * VISIBLE_DAYS, 0), DAYS_AHEAD - VISIBLE_DAYS);
        renderDates();
      })
    );
    document.querySelectorAll('[data-day]').forEach((b) =>
      b.addEventListener('click', () => {
        state.day = new Date(Number(b.dataset.day));
        if (state.hour !== null && slotInPast(state.day, state.hour)) state.hour = null;
        renderDates();
        renderTimes();
        renderSummary();
      })
    );
  }

  function renderTimes() {
    setHTML('times', HOURS.map((h) => {
      const disabled = !state.day || slotInPast(state.day, h);
      const selected = state.hour === h;
      return html`<button type="button" data-hour="${h}" ${disabled ? RH.ui.raw('disabled') : ''} class="rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        selected ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-ink hover:border-brand-200'
      }">${hourLabel(h)}</button>`;
    }));
    document.querySelectorAll('[data-hour]').forEach((b) =>
      b.addEventListener('click', () => {
        state.hour = Number(b.dataset.hour);
        renderTimes();
        renderSummary();
      })
    );
  }

  function renderModes() {
    setHTML('modes', Object.entries(RH.data.SERVICE_MODES).map(([key, m]) => html`
      <label class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${state.mode === key ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-brand-200'}">
        <input type="radio" name="mode" value="${key}" class="mt-1 text-brand-600" ${state.mode === key ? RH.ui.raw('checked') : ''} />
        <span><span class="flex items-center gap-2 text-sm font-semibold text-ink"><i class="fa-solid ${m.icon} text-brand-600"></i>${m.label}</span>
        <span class="mt-0.5 block text-xs text-slate-500">${m.hint}</span></span>
      </label>`));
    document.querySelectorAll('input[name="mode"]').forEach((r) =>
      r.addEventListener('change', () => {
        state.mode = r.value;
        renderModes();
        renderSummary();
      })
    );
  }

  function renderSummary() {
    const q = state.quote;
    const row = (icon, k, v) => html`<div class="flex items-start justify-between gap-3 py-2 text-sm"><span class="flex items-center gap-2 text-slate-500"><i class="fa-solid ${icon} w-4 text-slate-400"></i>${k}</span><span class="text-right font-medium text-ink">${v || '—'}</span></div>`;
    setHTML('summary', html`
      <div class="divide-y divide-slate-100">
        ${q.laborCost ? row('fa-screwdriver-wrench', 'Labour', RH.ui.money(q.laborCost)) : ''}
        ${q.partsCost ? row('fa-microchip', 'Parts', RH.ui.money(q.partsCost)) : ''}
        ${row('fa-file-invoice', 'Technician quote', RH.ui.money(q.price))}
        ${row('fa-shield-halved', 'Warranty', q.warrantyDays ? `${q.warrantyDays} days` : 'None')}
        ${row('fa-house', 'Service mode', RH.data.SERVICE_MODES[state.mode].label)}
        ${row('fa-calendar', 'Appointment date', state.day && RH.ui.date(state.day))}
        ${row('fa-clock', 'Appointment time', state.hour !== null && hourLabel(state.hour))}
      </div>
      <div class="mt-4 flex items-end justify-between border-t border-slate-100 pt-4">
        <span class="font-semibold text-ink">Total</span>
        <span class="text-2xl font-bold text-brand-600">${RH.ui.money(q.price)}</span>
      </div>`);
  }

  function render() {
    const { request: r, quote: q, tech } = state;
    const name = RH.data.techName(q.technicianId);
    const t = tech || q.technicianId || {};
    setHTML('root', html`<div class="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div class="min-w-0 space-y-5">
        <div>
          <h1 class="text-2xl font-bold text-ink">Book technician</h1>
          <p class="mt-1 text-slate-500">Confirm your preferred service details to book ${name}.</p>
        </div>

        <section class="card-soft flex flex-col gap-5 p-5 md:flex-row">
          <div class="flex flex-1 items-start gap-4">
            ${RH.ui.avatar(name, 'w-16 h-16 text-xl')}
            <div class="min-w-0">
              <p class="flex flex-wrap items-center gap-2 text-lg font-semibold text-ink">${name}<span class="badge bg-white text-brand-700"><i class="fa-solid fa-circle-check"></i>Verified</span></p>
              <p class="mt-1 text-xs text-slate-500"><i class="fa-solid fa-star text-amber-400"></i> <b class="text-ink">${t.ratingAvg ? t.ratingAvg.toFixed(1) : 'New'}</b> (${t.jobsCompleted || 0} jobs completed)</p>
              <p class="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                ${t.serviceAreas && t.serviceAreas.length ? html`<span><i class="fa-solid fa-location-dot"></i> ${t.serviceAreas.join(', ')}</span>` : ''}
                ${t.experienceYears ? html`<span><i class="fa-regular fa-calendar"></i> ${t.experienceYears} years experience</span>` : ''}
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                ${q.warrantyDays ? html`<span class="badge bg-white text-brand-700"><i class="fa-solid fa-shield-halved"></i>${q.warrantyDays}-day warranty</span>` : ''}
                ${q.estimatedDays !== undefined ? html`<span class="badge bg-white text-brand-700"><i class="fa-regular fa-clock"></i>${q.estimatedDays === 0 ? 'Same-day repair' : `${q.estimatedDays}-day repair`}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3 border-t border-brand-100 pt-4 md:w-56 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            ${RH.ui.deviceTile(r.itemType, 'w-12 h-12 text-xl')}
            <div><p class="font-semibold text-ink">${RH.data.requestTitle(r)}</p><p class="text-xs text-slate-500">${r.brandModel || (r.serviceCategoryId && r.serviceCategoryId.name) || ''}</p></div>
          </div>
        </section>

        <section class="card space-y-4 p-5">
          ${stepHeader(1, 'fa-calendar', 'Select appointment date', 'Choose a convenient date for your repair service')}
          <div id="dates" class="flex items-center gap-2"></div>
        </section>

        <section class="card space-y-4 p-5">
          ${stepHeader(2, 'fa-clock', 'Select time', 'Choose a time slot that works for you')}
          <div id="times" class="flex flex-wrap gap-2"></div>
        </section>

        <section class="card space-y-4 p-5">
          ${stepHeader(3, 'fa-house', 'Choose service mode', 'Select how you want the repair to be done')}
          <div id="modes" class="grid gap-3 sm:grid-cols-3"></div>
          <div>
            <label for="address" class="label">Address</label>
            <input id="address" maxlength="300" class="input" value="${r.address || ''}" placeholder="Where should the technician meet you?" />
          </div>
          <div>
            <label for="notes" class="label">Notes for the technician <span class="font-normal text-slate-400">(optional)</span></label>
            <textarea id="notes" rows="2" maxlength="500" class="input resize-none" placeholder="e.g. Gate code, landmark, best phone to call"></textarea>
          </div>
        </section>
      </div>

      <aside class="space-y-4">
        <div class="card p-5 lg:sticky lg:top-24">
          <h2 class="font-semibold text-ink">Booking summary</h2>
          <div class="mt-3 flex items-center gap-3 rounded-xl bg-brand-50 p-3">${RH.ui.deviceTile(r.itemType, 'w-11 h-11 text-lg')}
            <div><p class="text-sm font-semibold text-ink">${RH.data.requestTitle(r)}</p><p class="text-xs text-slate-500">${r.brandModel || ''}</p></div></div>
          <div id="summary" class="mt-2"></div>
          <button id="book-btn" class="btn-primary mt-5 w-full">Continue to payment <i class="fa-solid fa-arrow-right"></i></button>
          <a href="${RH.url('customer/quotations.html', { request: r._id })}" class="btn-outline mt-3 w-full">Back to quotations</a>
        </div>
        <div class="card-soft flex gap-3 p-5">
          <i class="fa-solid fa-shield-halved mt-0.5 text-brand-600"></i>
          <div><p class="text-sm font-semibold text-ink">Secure booking</p><p class="mt-1 text-xs text-slate-600">Your payment is held in escrow and only released after you confirm the repair.</p></div>
        </div>
      </aside>
    </div>`);

    state.day = days.find(dayHasSlots) || null;
    renderDates();
    renderTimes();
    renderModes();
    renderSummary();
    document.getElementById('book-btn').addEventListener('click', book);
  }

  async function goToExistingJob() {
    const { data: jobs } = await RH.api.jobs.list({ limit: 100 });
    const job = jobs.find((j) => j.repairRequestId && String(j.repairRequestId._id) === String(requestId) && j.status !== 'cancelled');
    if (job) RH.go(job.payment.status === 'unpaid' ? 'customer/payment.html' : 'customer/repair-details.html', { job: job._id });
    return !!job;
  }

  async function book() {
    const btn = document.getElementById('book-btn');
    if (!state.day || state.hour === null) {
      RH.ui.toast('Please choose an appointment date and time.', 'error');
      return;
    }
    const address = document.getElementById('address').value.trim();
    if (state.mode !== 'dropoff' && !address) {
      RH.ui.toast('Please enter the address for this repair.', 'error');
      document.getElementById('address').focus();
      return;
    }
    await RH.ui.withLoading(btn, async () => {
      try {
        const notes = document.getElementById('notes').value.trim();
        const { data } = await RH.api.appointments.create({
          quotationId: state.quote._id,
          scheduledAt: RH.data.toISO(state.day, state.hour),
          serviceMode: state.mode,
          ...(address ? { address } : {}),
          ...(notes ? { notes } : {}),
        });
        RH.flash('Appointment booked! Choose how you want to pay.');
        RH.go('customer/payment.html', { job: data.repairJobId });
      } catch (e) {
        if (e.status === 409 && /already exists/i.test(e.message) && (await goToExistingJob().catch(() => false))) return;
        RH.ui.toast(e.message, 'error');
      }
    }, 'Booking…');
  }

  async function load() {
    if (!requestId || !quoteId) {
      setHTML('root', RH.ui.errorState('Choose a quotation first.'));
      return;
    }
    setHTML('root', RH.ui.spinner());
    try {
      const [r, q] = await Promise.all([RH.api.repairRequests.get(requestId), RH.api.quotations.forRequest(requestId)]);
      state.request = r.data;
      state.quote = (q.data || []).find((x) => x._id === quoteId);
      if (!state.quote) throw new RH.ApiError('This quotation is no longer available.', 404);
      if (state.quote.status !== 'accepted') {
        setHTML('root', RH.ui.emptyState('fa-hand-pointer', 'Select this technician first', 'Accept the quotation on the quotations page, then come back to book an appointment.',
          html`<a class="btn-primary btn-sm" href="${RH.url('customer/quotations.html', { request: requestId })}">View quotations</a>`));
        return;
      }
      // Already booked (e.g. the user came back with the browser's Back button)? Move on.
      if (state.request.status !== 'booked' || (await goToExistingJob().catch(() => false))) {
        if (state.request.status !== 'booked') RH.go('customer/my-repairs.html');
        return;
      }
      state.tech = await RH.data.technician(state.quote.technicianId && state.quote.technicianId._id);
      render();
    } catch (e) {
      setHTML('root', RH.ui.errorState(e.message, true));
    }
  }

  load();
})();
