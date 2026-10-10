(function () {
  const user = RH.layout.app({ active: 'repairs' });
  if (!user) return;
  const { html, setHTML } = RH.ui;
  const jobParam = RH.param('job');
  const idParam = RH.param('id');

  const kv = (icon, k, v) => html`<div class="flex items-start gap-3 py-2"><i class="fa-solid ${icon} mt-0.5 w-4 text-slate-400"></i>
    <div class="flex flex-1 flex-wrap justify-between gap-x-4 text-sm"><span class="text-slate-500">${k}</span><span class="font-semibold text-ink">${v || '—'}</span></div></div>`;

  function daysLeft(w) {
    const ms = new Date(w.expiresAt) - Date.now();
    return ms > 0 ? Math.ceil(ms / 86400000) : 0;
  }

  // Claim progress: Submitted -> Under review -> Resolved | Rejected
  function claimCard(c) {
    const final = c.status !== 'open';
    const steps = [
      ['Submitted', RH.ui.dateTime(c.createdAt), true],
      ['Under review', final ? 'Reviewed' : 'The technician is reviewing your claim', true],
      [c.status === 'rejected' ? 'Rejected' : 'Resolved', final ? RH.ui.dateTime(c.resolvedAt) : "You'll be notified once resolved", final],
    ];
    const tone = c.status === 'rejected' ? 'bg-red-500' : 'bg-green-500';
    return html`<article class="card p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="font-semibold text-ink">Claim ${RH.ui.ref(c._id, 'CL')}</p>
        ${c.status === 'open' ? RH.ui.toneBadge('Under review', 'amber') : RH.ui.badge(c.status)}
      </div>
      <ol class="mt-5 grid gap-4 sm:grid-cols-3">
        ${steps.map(([label, hint, reached], i) => html`<li class="flex items-center gap-3 sm:flex-col sm:text-center">
          <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            reached ? (i === 2 ? tone : 'bg-green-500') + ' text-white' : 'border border-slate-200 text-slate-300'
          }"><i class="fa-solid ${i === 2 && c.status === 'rejected' ? 'fa-xmark' : i === 1 && !final ? 'fa-clock' : 'fa-check'}"></i></span>
          <span><span class="block text-sm font-semibold ${reached ? 'text-ink' : 'text-slate-400'}">${label}</span><span class="block text-xs text-slate-500">${hint}</span></span>
        </li>`)}
      </ol>
      <div class="mt-5 rounded-xl bg-slate-50 p-4 text-sm"><p class="text-xs text-slate-500">Your description</p><p class="mt-1 text-ink">${c.description}</p></div>
      ${c.resolutionNote ? html`<div class="mt-3 rounded-xl bg-brand-50 p-4 text-sm"><p class="text-xs text-slate-500">Technician's response</p><p class="mt-1 text-ink">${c.resolutionNote}</p></div>` : ''}
    </article>`;
  }

  function render(w, job, tech, appt) {
    const r = job.repairRequestId || {};
    const active = new Date(w.expiresAt) > new Date();
    const openClaim = w.claims.find((c) => c.status === 'open');
    const canClaim = active && !openClaim;
    const name = RH.data.techName(tech);
    const mode = appt && RH.data.SERVICE_MODES[appt.serviceMode];
    document.getElementById('back').href = RH.url('customer/repair-details.html', { job: job._id });

    setHTML('root', html`<div class="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div class="min-w-0 space-y-5">
        <div>
          <h1 class="text-2xl font-bold text-ink">${openClaim ? 'Warranty claim submitted' : 'Warranty details'}</h1>
          <p class="mt-1 text-slate-500">${openClaim ? 'Your claim has been received and is being reviewed.' : 'Coverage information for your completed repair.'}</p>
        </div>

        <section class="rounded-2xl border p-5 ${active ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}">
          <div class="flex flex-wrap items-start gap-4">
            <span class="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl ${active ? 'text-green-600' : 'text-slate-400'} shadow-sm"><i class="fa-solid fa-shield-halved"></i></span>
            <div class="min-w-0 flex-1">
              <p class="text-xl font-semibold text-ink">${active ? 'Warranty active' : 'Warranty expired'}</p>
              <p class="text-sm text-slate-600">Your repair ${active ? 'is' : 'was'} covered for ${w.durationDays} days from the completion date.</p>
            </div>
            ${active ? RH.ui.toneBadge(openClaim ? 'Claim under review' : 'Active', openClaim ? 'amber' : 'green') : RH.ui.toneBadge('Expired', 'slate')}
          </div>
          <div class="mt-5 grid gap-x-8 rounded-xl bg-white/70 p-4 md:grid-cols-2">
            <div>
              ${kv('fa-hashtag', 'Warranty ID', RH.ui.ref(w._id, 'WR'))}
              ${kv('fa-wrench', 'Repair', [r.brandModel, r.itemType].filter(Boolean).join(' · '))}
              ${kv('fa-calendar-check', 'Repair completed', RH.ui.dateTime(w.issuedAt))}
            </div>
            <div>
              ${kv('fa-user', 'Technician', name)}
              ${kv('fa-shield', 'Coverage period', `${w.durationDays} days`)}
              ${kv('fa-calendar', 'Expires on', RH.ui.date(w.expiresAt))}
              ${kv('fa-hourglass-half', 'Time remaining', active ? `${daysLeft(w)} days` : 'Expired')}
            </div>
          </div>
        </section>

        <section class="card p-5">
          <h2 class="font-semibold text-ink">Coverage terms</h2>
          <p class="mt-1 text-sm text-slate-500">What this warranty covers for the completed repair.</p>
          <p class="mt-4 flex gap-3 rounded-xl bg-slate-50 p-4 text-sm text-ink"><i class="fa-solid fa-file-contract mt-0.5 text-brand-600"></i>${w.terms}</p>
        </section>

        ${w.claims.length ? html`<section class="space-y-4"><h2 class="font-semibold text-ink">Your claims</h2>${[...w.claims].reverse().map(claimCard)}</section>` : ''}

        ${canClaim
          ? html`<section class="card p-5">
              <h2 class="font-semibold text-ink">Make a warranty claim</h2>
              <p class="mt-1 text-sm text-slate-500">Is the same problem back? Describe what's happening and the technician will review it.</p>
              <form id="claim-form" class="mt-4 space-y-3" novalidate>
                <textarea name="description" rows="4" maxlength="1000" class="input resize-y" placeholder="e.g. The screen started flickering again two weeks after the repair."></textarea>
                <button type="submit" class="btn-primary w-full sm:w-auto">Submit claim <i class="fa-solid fa-arrow-right"></i></button>
              </form>
            </section>`
          : ''}
      </div>

      <aside class="space-y-4">
        <div class="card p-5">
          <h2 class="font-semibold text-ink">Original repair</h2>
          <div class="mt-3 flex items-center gap-3 rounded-xl bg-brand-50 p-3">${RH.ui.deviceTile(r.itemType, 'w-11 h-11 text-lg')}
            <div><p class="text-sm font-semibold text-ink">${RH.data.requestTitle(r)}</p><p class="text-xs text-slate-500">${r.brandModel || ''}</p></div></div>
          <div class="mt-2 divide-y divide-slate-100">
            ${kv('fa-user', 'Technician', name)}
            ${kv('fa-calendar', 'Appointment', appt && RH.ui.dateTime(appt.scheduledAt))}
            ${kv('fa-house', 'Service mode', mode && mode.label)}
            ${kv('fa-location-dot', 'Address', (appt && appt.address) || r.address)}
            ${kv('fa-wallet', 'Total paid', RH.ui.money(job.price))}
            ${kv('fa-hashtag', 'Request ID', RH.ui.ref(r._id))}
          </div>
          <a href="${RH.url('customer/repair-details.html', { job: job._id })}" class="btn-outline btn-sm mt-4 w-full">View original repair</a>
        </div>
        ${canClaim
          ? html`<div class="card-soft p-5"><p class="flex items-center gap-2 font-semibold text-ink"><i class="fa-solid fa-shield-halved text-brand-600"></i>Experiencing an issue?</p>
              <p class="mt-1 text-xs text-slate-600">If you're having a problem related to this repair, submit a warranty claim for review.</p>
              <a href="#claim-form" class="btn-primary btn-sm mt-3 w-full">Claim warranty</a></div>`
          : ''}
      </aside>
    </div>`);

    const form = document.getElementById('claim-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        RH.ui.clearErrors(form);
        const description = form.description.value.trim();
        if (description.length < 5) return RH.ui.fieldError(form, 'description', 'Please describe the issue (at least 5 characters).');
        await RH.ui.withLoading(form.querySelector('[type="submit"]'), async () => {
          try {
            await RH.api.warranties.claim(w._id, description);
            RH.ui.toast('Warranty claim submitted.', 'success');
            load(w._id);
          } catch (err) {
            RH.ui.toast(err.message, 'error');
          }
        }, 'Submitting…');
      });
    }
  }

  async function load(warrantyId) {
    setHTML('root', RH.ui.spinner());
    try {
      let w;
      if (warrantyId || idParam) w = (await RH.api.warranties.get(warrantyId || idParam)).data;
      else if (jobParam) w = (await RH.api.warranties.byJob(jobParam)).data;
      else throw new RH.ApiError('No warranty was specified.', 400);

      const { data: job } = await RH.api.jobs.get(w.repairJobId);
      const [tech, appt] = await Promise.all([
        RH.data.technician(job.technicianId),
        RH.api.appointments.get(job.appointmentId).then((r) => r.data).catch(() => null),
      ]);
      render(w, job, tech, appt);
    } catch (e) {
      setHTML('root', e.status === 404
        ? RH.ui.emptyState('fa-shield', 'No warranty for this repair', 'A warranty is issued when the technician completes a repair that came with warranty cover.')
        : RH.ui.errorState(e.message, true));
    }
  }

  load();
})();
