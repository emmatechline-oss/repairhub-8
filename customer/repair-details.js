(function () {
  const user = RH.layout.app({ active: 'repairs' });
  if (!user) return;
  const { html, setHTML } = RH.ui;
  const jobId = RH.param('job');
  let ctx = {}; // { job, appt, tech, warranty, review }

  // The progress line shown to customers, and where each backend status sits on it.
  const STAGES = [
    ['accepted', 'Booking confirmed'],
    ['diagnosing', 'Diagnosing'],
    ['in_progress', 'Repair in progress'],
    ['quality_check', 'Quality check'],
    ['completed', 'Completed'],
  ];
  const RANK = { accepted: 0, diagnosing: 1, awaiting_parts: 1, in_progress: 2, quality_check: 3, ready: 3, completed: 4 };

  const NOTICES = {
    awaiting_parts: ['amber', 'fa-box-open', 'Waiting for parts', 'The technician is waiting for replacement parts before continuing.'],
    on_hold: ['amber', 'fa-pause', 'Repair on hold', 'The technician has paused this repair. They will contact you with an update.'],
    ready: ['green', 'fa-circle-check', 'Your device is ready', 'The repair is done and your device is ready for pickup or delivery.'],
    disputed: ['red', 'fa-scale-balanced', 'Under dispute', 'This repair is under review by RepairHub support.'],
    cancelled: ['red', 'fa-ban', 'Booking cancelled', 'This booking was cancelled. Any escrowed payment was refunded to your wallet.'],
  };
  const NOTICE_TONES = { amber: 'bg-amber-50 text-amber-800', green: 'bg-green-50 text-green-800', red: 'bg-red-50 text-red-700' };

  function currentRank(job) {
    if (RANK[job.status] !== undefined) return RANK[job.status];
    // on_hold / disputed / cancelled: show how far the repair had got.
    return Math.max(0, ...job.statusHistory.map((h) => (RANK[h.status] !== undefined ? RANK[h.status] : 0)));
  }

  function stageTime(job, status) {
    const hits = job.statusHistory.filter((h) => h.status === status);
    return hits.length ? hits[hits.length - 1].changedAt : null;
  }

  const kv = (icon, k, v, strong) => html`<div class="flex items-start justify-between gap-4 py-2.5 text-sm"><span class="flex items-center gap-2 text-slate-500"><i class="fa-solid ${icon} w-4 text-slate-400"></i>${k}</span><span class="text-right ${strong ? 'text-lg font-bold text-brand-600' : 'font-medium text-ink'}">${v || '—'}</span></div>`;

  function timeline(job) {
    const rank = currentRank(job);
    const cancelled = job.status === 'cancelled';
    return html`<section class="card p-5">
      <h2 class="font-semibold text-ink">Repair progress</h2>
      <p class="text-sm text-slate-500">${job.status === 'completed' ? 'Your repair has been completed. Thank you for using RepairHub!' : `Current status: ${RH.ui.statusLabel(job.status)}`}</p>
      <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full ${cancelled ? 'bg-red-400' : 'bg-green-500'}" style="width:${Math.max(job.progress || 0, 4)}%"></div></div>
      <ol class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-5">
        ${STAGES.map(([status, label], i) => {
          const done = i < rank || (i === rank && (job.status === 'completed' || i === 0));
          const current = i === rank && !done && !cancelled;
          const when = stageTime(job, status);
          return html`<li class="flex items-center gap-3 sm:flex-col sm:text-center">
            <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              done ? 'bg-green-500 text-white' : current ? 'border-2 border-brand-600 bg-brand-50 text-brand-600' : 'border border-slate-200 text-slate-300'
            }"><i class="fa-solid ${done ? 'fa-check' : current ? 'fa-spinner' : 'fa-circle'} ${done || current ? '' : 'text-[8px]'}"></i></span>
            <span><span class="block text-sm font-semibold ${done || current ? 'text-ink' : 'text-slate-400'}">${label}</span>
            <span class="block text-xs text-slate-500">${when ? `${RH.ui.shortDate(when)}, ${RH.ui.time(when)}` : ''}</span></span>
          </li>`;
        })}
      </ol>
      ${job.statusHistory.some((h) => h.note)
        ? html`<details class="mt-5 border-t border-slate-100 pt-4"><summary class="cursor-pointer text-sm font-medium text-brand-600">View activity</summary>
            <ul class="mt-3 space-y-3">${[...job.statusHistory].reverse().map((h) => html`<li class="flex gap-3 text-sm">
              <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600"></span>
              <span><span class="font-medium text-ink">${RH.ui.statusLabel(h.status)}</span>${h.note ? html` · <span class="text-slate-600">${h.note}</span>` : ''}
              <span class="block text-xs text-slate-400">${RH.ui.dateTime(h.changedAt)}</span></span></li>`)}</ul></details>`
        : ''}
    </section>`;
  }

  function techCard(tech, job) {
    const name = RH.data.techName(tech) || (job.contact && job.contact.name);
    const phone = job.contact && job.contact.phone;
    return html`<section class="card p-5">
      <h2 class="font-semibold text-ink">Technician</h2>
      <div class="mt-3 flex items-center gap-3">
        ${RH.ui.avatar(name, 'w-14 h-14 text-lg')}
        <div class="min-w-0">
          <p class="font-semibold text-ink">${name} <i class="fa-solid fa-circle-check text-sm text-brand-600"></i></p>
          ${tech
            ? html`<p class="text-xs text-slate-500"><i class="fa-solid fa-star text-amber-400"></i> ${tech.ratingAvg ? tech.ratingAvg.toFixed(1) : 'New'} (${tech.jobsCompleted || 0} jobs completed)</p>
              <p class="text-xs text-slate-500">${[tech.serviceAreas && tech.serviceAreas.join(', '), tech.experienceYears && `${tech.experienceYears} years experience`].filter(Boolean).join(' · ')}</p>`
            : ''}
        </div>
      </div>
      ${phone ? html`<a href="tel:${phone}" class="btn-outline btn-sm mt-4 w-full"><i class="fa-solid fa-phone"></i>Call technician</a>` : ''}
    </section>`;
  }

  function warrantyCard(w) {
    if (!w) return '';
    const active = new Date(w.expiresAt) > new Date();
    return html`<section class="rounded-2xl border p-5 ${active ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}">
      <div class="flex items-center gap-3">
        <span class="inline-flex h-12 w-12 items-center justify-center rounded-xl ${active ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'} text-xl"><i class="fa-solid fa-shield-halved"></i></span>
        <div><p class="font-semibold text-ink">${active ? 'Warranty active' : 'Warranty expired'}</p>
          <p class="text-xs text-slate-600">${w.durationDays}-day repair warranty · ${active ? 'valid until' : 'ended'} ${RH.ui.date(w.expiresAt)}</p></div>
      </div>
      <a href="${RH.url('customer/warranty.html', { job: w.repairJobId })}" class="btn-outline btn-sm mt-4 w-full">View warranty details <i class="fa-solid fa-arrow-right"></i></a>
    </section>`;
  }

  function reviewCard(review, job) {
    if (review) {
      return html`<section class="card p-5">
        <h2 class="font-semibold text-ink">Your review</h2>
        <div class="mt-2 flex items-center gap-2">${RH.ui.stars(review.rating, 'text-base')}<span class="font-semibold text-ink">${review.rating}.0</span></div>
        ${review.comment ? html`<p class="mt-2 text-sm text-slate-600">${review.comment}</p>` : ''}
        ${review.tags && review.tags.length ? html`<div class="mt-3 flex flex-wrap gap-2">${review.tags.map((t) => html`<span class="badge bg-brand-50 text-brand-700">${t}</span>`)}</div>` : ''}
        <p class="mt-2 text-xs text-slate-400">${RH.ui.dateTime(review.createdAt)}</p>
      </section>`;
    }
    if (job.status !== 'completed') return '';
    return html`<section class="card-soft p-5">
      <p class="font-semibold text-ink">How did it go?</p>
      <p class="mt-1 text-sm text-slate-600">Help other customers by rating your technician.</p>
      <a href="${RH.url('customer/review.html', { job: job._id })}" class="btn-primary btn-sm mt-4 w-full"><i class="fa-regular fa-star"></i>Rate your experience</a>
    </section>`;
  }

  function actions(job, appt) {
    const list = [];
    if (job.payment.status === 'unpaid' && !['completed', 'cancelled', 'disputed'].includes(job.status)) {
      list.push(html`<a href="${RH.url('customer/payment.html', { job: job._id })}" class="btn-primary w-full"><i class="fa-solid fa-credit-card"></i>Pay ${RH.ui.money(job.price)}</a>`);
    }
    if (job.status === 'completed' && ['held', 'cash'].includes(job.payment.status) && !job.customerConfirmedAt) {
      list.push(html`<button data-action="confirm" class="btn-primary w-full"><i class="fa-solid fa-circle-check"></i>Confirm repair is done</button>`);
    }
    const changeable = appt && ['scheduled', 'rescheduled'].includes(appt.status) && ['accepted', 'diagnosing', 'on_hold'].includes(job.status);
    if (changeable) {
      list.push(html`<button data-action="reschedule" class="btn-outline w-full"><i class="fa-regular fa-calendar"></i>Reschedule</button>`);
      list.push(html`<button data-action="cancel" class="btn-danger w-full"><i class="fa-solid fa-xmark"></i>Cancel booking</button>`);
    }
    if (RH.disputes.canOpen(job) && !(ctx.dispute && ctx.dispute.status === 'open')) {
      list.push(html`<button data-action="dispute" class="btn-danger w-full"><i class="fa-solid fa-triangle-exclamation"></i>Report a problem</button>`);
    }
    list.push(html`<a href="${RH.url('customer/request-repair.html')}" class="btn-ghost w-full"><i class="fa-solid fa-rotate"></i>Book similar repair</a>`);
    return html`<section class="card space-y-3 p-5"><h2 class="font-semibold text-ink">Actions</h2>${list}</section>`;
  }

  function render() {
    const { job, appt, tech, warranty, review, dispute } = ctx;
    const r = job.repairRequestId || {};
    const done = job.status === 'completed';
    const notice = NOTICES[job.status];
    const mode = appt && RH.data.SERVICE_MODES[appt.serviceMode];

    setHTML('root', html`
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-center gap-4">
          ${done ? html`<span class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500 text-xl text-white"><i class="fa-solid fa-check"></i></span>` : ''}
          <div>
            <h1 class="text-2xl font-bold text-ink sm:text-3xl">${done ? 'Repair completed' : 'Track repair'}</h1>
            <p class="text-slate-500">${done ? `Your ${r.brandModel || r.itemType || 'device'} repair has been completed successfully.` : 'Follow your repair from booking to completion.'}</p>
          </div>
        </div>
        <div class="flex flex-col items-start gap-1 sm:items-end">${RH.ui.badge(job.status)}<span class="text-sm text-slate-500">Request ID: ${RH.ui.ref(r._id)}</span></div>
      </div>

      ${notice ? html`<p class="mt-4 flex gap-3 rounded-2xl p-4 text-sm ${NOTICE_TONES[notice[0]]}"><i class="fa-solid ${notice[1]} mt-0.5"></i><span><b>${notice[2]}.</b> ${notice[3]}</span></p>` : ''}
      ${done && job.customerConfirmedAt ? html`<p class="mt-4 flex gap-3 rounded-2xl bg-green-50 p-4 text-sm text-green-800"><i class="fa-solid fa-circle-check mt-0.5"></i>You confirmed this repair on ${RH.ui.dateTime(job.customerConfirmedAt)}.</p>` : ''}
      ${done && !job.customerConfirmedAt && ['held', 'cash'].includes(job.payment.status)
        ? html`<p class="mt-4 flex gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-700"><i class="fa-solid fa-circle-info mt-0.5"></i>Please inspect your device and confirm the repair is done${job.payment.status === 'held' ? ' to release payment to the technician' : ''}.</p>`
        : ''}

      <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div class="min-w-0 space-y-5">
          <section class="card-soft flex flex-col gap-5 p-5 md:flex-row md:items-center">
            ${RH.ui.deviceTile(r.itemType, 'w-24 h-24 text-4xl')}
            <div class="min-w-0 flex-1">
              <p class="text-xl font-semibold text-ink">${RH.data.requestTitle(r)}</p>
              <p class="text-sm text-slate-500">${r.brandModel || ''}</p>
              <p class="mt-3 text-sm text-slate-600">${r.problemDescription}</p>
            </div>
          </section>

          ${timeline(job)}

          <div class="grid gap-5 ${(r.mediaUrls && r.mediaUrls.length) || (appt && appt.notes) ? 'md:grid-cols-2' : ''}">
            <section class="card p-5">
              <h2 class="font-semibold text-ink">Service information</h2>
              <div class="mt-2 divide-y divide-slate-100">
                ${kv('fa-calendar', 'Appointment date', appt && RH.ui.date(appt.scheduledAt))}
                ${kv('fa-clock', 'Appointment time', appt && RH.ui.time(appt.scheduledAt))}
                ${kv('fa-house', 'Service mode', mode && mode.label)}
                ${kv('fa-location-dot', 'Service address', (appt && appt.address) || r.address)}
                ${kv('fa-credit-card', 'Payment method', RH.data.PAYMENT_METHODS[job.payment.method])}
                ${kv('fa-receipt', 'Payment status', RH.ui.statusLabel(job.payment.status))}
                ${job.payment.heldAt ? kv('fa-calendar-check', 'Payment date', RH.ui.dateTime(job.payment.heldAt)) : ''}
                ${kv('fa-wallet', 'Total', RH.ui.money(job.price), true)}
              </div>
            </section>
            <div class="space-y-5">
              ${r.mediaUrls && r.mediaUrls.length
                ? html`<section class="card p-5"><h2 class="font-semibold text-ink">Your photos &amp; videos</h2>
                    <div class="mt-3 grid grid-cols-3 gap-2">${r.mediaUrls.map((u) => /\.(mp4|mov)$/i.test(u)
                      ? html`<a href="${u}" target="_blank" rel="noopener" class="flex aspect-square items-center justify-center rounded-xl bg-slate-100 text-slate-500"><i class="fa-solid fa-film"></i></a>`
                      : html`<a href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="Uploaded photo" class="aspect-square w-full rounded-xl object-cover" /></a>`)}</div></section>`
                : ''}
              ${appt && appt.notes ? html`<section class="card p-5"><h2 class="font-semibold text-ink">Your notes</h2><p class="mt-2 text-sm text-slate-600">${appt.notes}</p></section>` : ''}
            </div>
          </div>
        </div>

        <aside class="space-y-5">
          ${techCard(tech, job)}
          ${warrantyCard(warranty)}
          ${RH.disputes.panel(dispute)}
          ${reviewCard(review, job)}
          ${actions(job, appt)}
        </aside>
      </div>`);

    document.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => ACTIONS[b.dataset.action](b)));
  }

  const ACTIONS = {
    dispute() {
      RH.disputes.open(ctx.job, load);
    },

    async confirm(btn) {
      const held = ctx.job.payment.status === 'held';
      const yes = await RH.ui.confirm('Confirm the repair is done?', held
        ? `This releases ${RH.ui.money(ctx.job.price)} from escrow to the technician. Only confirm once you're happy with the repair.`
        : 'Confirm that the repair is done and you have paid the technician.', { confirmText: 'Yes, confirm' });
      if (!yes) return;
      await RH.ui.withLoading(btn, async () => {
        try {
          await RH.api.jobs.confirm(ctx.job._id);
          RH.ui.toast('Thanks for confirming!', 'success');
          load();
        } catch (e) {
          RH.ui.toast(e.message, 'error');
        }
      });
    },

    reschedule() {
      const min = new Date(Date.now() + 60 * 60000);
      const local = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      const m = RH.ui.modal('Reschedule appointment', html`<form class="space-y-4">
        <div><label for="new-time" class="label">New date &amp; time</label>
        <input id="new-time" type="datetime-local" required min="${local(min)}" value="${local(new Date(Math.max(new Date(ctx.appt.scheduledAt), min)))}" class="input" /></div>
        <div class="flex justify-end gap-3"><button type="button" data-close class="btn-ghost btn-sm">Cancel</button><button type="submit" class="btn-primary btn-sm">Save</button></div>
      </form>`);
      m.el.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const value = m.el.querySelector('#new-time').value;
        if (!value || new Date(value) <= new Date()) return RH.ui.toast('Choose a time in the future.', 'error');
        await RH.ui.withLoading(e.submitter || m.el.querySelector('[type="submit"]'), async () => {
          try {
            await RH.api.appointments.reschedule(ctx.appt._id, new Date(value).toISOString());
            m.close();
            RH.ui.toast('Appointment rescheduled.', 'success');
            load();
          } catch (err) {
            RH.ui.toast(err.message, 'error');
          }
        });
      });
    },

    cancel() {
      const m = RH.ui.modal('Cancel booking?', html`<form class="space-y-4">
        <p class="text-sm text-slate-600">${ctx.job.payment.status === 'held' ? 'Your payment will be refunded in full to your RepairHub wallet.' : 'The technician will be notified.'}</p>
        <div><label for="reason" class="label">Reason <span class="font-normal text-slate-400">(optional)</span></label>
        <textarea id="reason" rows="3" maxlength="500" class="input resize-none"></textarea></div>
        <div class="flex justify-end gap-3"><button type="button" data-close class="btn-ghost btn-sm">Keep booking</button><button type="submit" class="btn-danger btn-sm">Cancel booking</button></div>
      </form>`);
      m.el.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await RH.ui.withLoading(m.el.querySelector('[type="submit"]'), async () => {
          try {
            await RH.api.appointments.cancel(ctx.appt._id, m.el.querySelector('#reason').value.trim());
            m.close();
            RH.ui.toast('Booking cancelled.', 'success');
            load();
          } catch (err) {
            RH.ui.toast(err.message, 'error');
          }
        });
      });
    },
  };

  async function findReview(job) {
    if (job.status !== 'completed') return null;
    try {
      const { data } = await RH.api.reviews.forTechnician(job.technicianId, { limit: 100 });
      return data.find((r) => String(r.repairJobId) === String(job._id)) || null;
    } catch (e) {
      return null;
    }
  }

  async function load() {
    if (!jobId) return setHTML('root', RH.ui.errorState('No repair was specified.'));
    if (!ctx.job) setHTML('root', RH.ui.spinner());
    try {
      const { data: job } = await RH.api.jobs.get(jobId);
      const [appt, tech, warranty, review, disputes] = await Promise.all([
        RH.api.appointments.get(job.appointmentId).then((r) => r.data).catch(() => null),
        RH.data.technician(job.technicianId),
        job.status === 'completed' ? RH.api.warranties.byJob(job._id).then((r) => r.data).catch(() => null) : null,
        findReview(job),
        RH.disputes.byJob().catch(() => new Map()),
      ]);
      ctx = { job, appt, tech, warranty, review, dispute: disputes.get(String(job._id)) };
      render();
    } catch (e) {
      setHTML('root', RH.ui.errorState(e.message, true));
    }
  }

  load();
})();
