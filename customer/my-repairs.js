(function () {
  const user = RH.layout.app({ active: 'repairs' });
  if (!user) return;
  const { html, setHTML } = RH.ui;

  const TABS = {
    all: 'All',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  let tab = TABS[RH.param('tab')] ? RH.param('tab') : 'all';
  let rows = [];

  /**
   * One row per repair request, joined with its (latest non-cancelled) repair job if booked.
   * The request status drives the tab; the job, when there is one, drives the badge and action.
   */
  function buildRows(requests, jobs, techs) {
    return requests.map((r) => {
      const mine = jobs.filter((j) => j.repairRequestId && String(j.repairRequestId._id) === String(r._id));
      const job = mine.find((j) => j.status !== 'cancelled') || mine[0] || null;
      const tech = job ? techs.get(String(job.technicianId)) : null;
      const bucket = r.status === 'completed' ? 'completed' : r.status === 'cancelled' ? 'cancelled' : 'active';
      return { request: r, job, tech, bucket };
    });
  }

  function action(row) {
    const { request: r, job } = row;
    const go = (label, page, params, primary) =>
      html`<a href="${RH.url(page, params)}" class="${primary ? 'btn-primary' : 'btn-outline'} btn-sm w-full sm:w-36">${label}</a>`;
    if (r.status === 'cancelled') return go('Book again', 'customer/request-repair.html', { category: r.serviceCategoryId && r.serviceCategoryId._id });
    if (!job) {
      if (r.status === 'booked') {
        return go('Book appointment', 'customer/book.html', { request: r._id, quote: r.acceptedQuotationId }, true);
      }
      return go(r.status === 'quoted' ? 'View quotations' : 'View request', 'customer/quotations.html', { request: r._id }, r.status === 'quoted');
    }
    if (job.payment.status === 'unpaid' && !['completed', 'cancelled', 'disputed'].includes(job.status)) {
      return go('Pay now', 'customer/payment.html', { job: job._id }, true);
    }
    if (job.status === 'completed') return go('View details', 'customer/repair-details.html', { job: job._id });
    return go('Track repair', 'customer/repair-details.html', { job: job._id });
  }

  function rowCard(row) {
    const { request: r, job, tech } = row;
    const cat = r.serviceCategoryId && r.serviceCategoryId.name;
    const w = RH.data.warranty(job);
    const name = tech ? RH.data.techName(tech) : null;
    let dateLabel = 'Requested';
    let dateValue = r.createdAt;
    if (job && job.completedAt) {
      dateLabel = 'Completed';
      dateValue = job.completedAt;
    } else if (job) {
      dateLabel = 'Booked';
      dateValue = job.createdAt;
    } else if (r.status === 'cancelled') {
      dateLabel = 'Cancelled';
      dateValue = r.updatedAt;
    }

    return html`<article class="card-soft flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      ${RH.ui.deviceTile(r.itemType || cat, 'w-20 h-20 text-3xl')}
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0">
            <h3 class="truncate font-semibold text-ink">${RH.data.requestTitle(r)}</h3>
            <p class="text-sm text-slate-500">${[r.brandModel, cat].filter(Boolean).join(' | ')}</p>
          </div>
          <div class="flex flex-col items-end gap-1">
            ${RH.ui.badge(job && r.status !== 'cancelled' ? job.status : r.status)}
            ${w ? RH.ui.toneBadge(w.active ? 'Warranty active' : 'Warranty expired', w.active ? 'green' : 'slate') : ''}
          </div>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span class="flex items-center gap-2 text-slate-500"><i class="fa-regular fa-calendar"></i><span><span class="block text-xs">${dateLabel}</span><span class="font-medium text-ink">${RH.ui.dateTime(dateValue)}</span></span></span>
          ${name
            ? html`<span class="flex items-center gap-2">${RH.ui.avatar(name, 'w-8 h-8 text-xs')}<span><span class="block font-medium text-ink">${name} <i class="fa-solid fa-circle-check text-xs text-brand-600"></i></span>
                <span class="text-xs text-slate-500"><i class="fa-solid fa-star text-amber-400"></i> ${tech.ratingAvg ? tech.ratingAvg.toFixed(1) : 'New'} (${tech.jobsCompleted || 0} jobs)</span></span></span>`
            : ''}
        </div>
      </div>
      <div class="flex flex-row items-center justify-between gap-3 border-t border-brand-100 pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
        <div class="sm:text-right">
          <p class="text-xl font-bold text-ink">${job ? RH.ui.money(job.price) : '—'}</p>
          <p class="text-xs text-slate-500">${job ? RH.ui.statusLabel(job.payment.status) : r.status === 'cancelled' ? 'Not charged' : 'Awaiting quote'}</p>
        </div>
        ${action(row)}
      </div>
    </article>`;
  }

  function render() {
    const q = document.getElementById('search').value.trim().toLowerCase();
    const counts = { all: rows.length };
    ['active', 'completed', 'cancelled'].forEach((b) => (counts[b] = rows.filter((r) => r.bucket === b).length));

    setHTML('tabs', Object.entries(TABS).map(([key, label]) => html`<button role="tab" data-tab="${key}" aria-selected="${key === tab}" class="whitespace-nowrap border-b-2 pb-3 ${
      key === tab ? 'border-brand-600 font-semibold text-brand-600' : 'border-transparent text-slate-500 hover:text-ink'
    }">${label} (${counts[key]})</button>`));
    document.querySelectorAll('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        tab = b.dataset.tab;
        history.replaceState(null, '', RH.url('customer/my-repairs.html', { tab }));
        render();
      })
    );

    const visible = rows.filter((row) => {
      if (tab !== 'all' && row.bucket !== tab) return false;
      if (!q) return true;
      const r = row.request;
      return [r.itemType, r.brandModel, r.serviceCategoryId && r.serviceCategoryId.name, row.tech && RH.data.techName(row.tech), RH.ui.ref(r._id)]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(q));
    });

    if (!rows.length) {
      setHTML('list', RH.ui.emptyState('fa-screwdriver-wrench', 'No repairs yet', 'Request your first repair and get quotes from verified technicians.',
        html`<a href="${RH.url('customer/request-repair.html')}" class="btn-primary btn-sm">Request a repair</a>`));
    } else if (!visible.length) {
      setHTML('list', RH.ui.emptyState('fa-magnifying-glass', 'Nothing here', q ? 'No repairs match your search.' : `You have no ${TABS[tab].toLowerCase()} repairs.`));
    } else {
      setHTML('list', visible.map(rowCard));
    }

    const countRow = (icon, tone, label, n) => html`<div class="flex items-center gap-3 rounded-lg px-3 py-3">
      <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg ${tone}"><i class="fa-solid ${icon}"></i></span>
      <span class="flex-1 text-sm text-brand-700">${label}</span><span class="font-semibold text-ink">${n}</span></div>`;
    setHTML('counts', html`${countRow('fa-file-lines', 'bg-slate-100 text-slate-500', 'Total repairs', counts.all)}
      ${countRow('fa-clock', 'bg-brand-50 text-brand-600', 'Active repairs', counts.active)}
      ${countRow('fa-circle-check', 'bg-green-50 text-green-600', 'Completed repairs', counts.completed)}
      ${countRow('fa-circle-xmark', 'bg-red-50 text-red-600', 'Cancelled repairs', counts.cancelled)}`);

    const covered = rows
      .map((row) => ({ row, w: RH.data.warranty(row.job) }))
      .filter((x) => x.w && x.w.active)
      .sort((a, b) => a.w.expiresAt - b.w.expiresAt)
      .slice(0, 3);
    setHTML('warranties', covered.length
      ? covered.map(({ row, w }) => html`<a href="${RH.url('customer/warranty.html', { job: row.job._id })}" class="flex items-center gap-3 rounded-xl bg-white p-3 transition hover:shadow-sm">
          ${RH.ui.deviceTile(row.request.itemType, 'w-9 h-9 text-sm')}
          <span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium text-ink">${row.request.brandModel || RH.data.requestTitle(row.request)}</span>
          <span class="text-xs text-slate-500">Valid until ${RH.ui.shortDate(w.expiresAt)}</span></span>
          <i class="fa-solid fa-chevron-right text-xs text-slate-400"></i></a>`)
      : html`<p class="text-sm text-slate-500">No active warranties.</p>`);
  }

  async function load() {
    setHTML('list', RH.ui.spinner());
    try {
      const [{ data: requests }, { data: jobs }] = await Promise.all([
        RH.api.repairRequests.list({ limit: 100 }),
        RH.api.jobs.list({ limit: 100 }),
      ]);
      const techIds = [...new Set(jobs.map((j) => String(j.technicianId)))];
      const profiles = await Promise.all(techIds.map((id) => RH.data.technician(id)));
      const techs = new Map(techIds.map((id, i) => [id, profiles[i]]));
      rows = buildRows(requests, jobs, techs);
      render();
    } catch (e) {
      setHTML('list', RH.ui.errorState(e.message, true));
    }
  }

  document.getElementById('search').addEventListener('input', render);
  load();
})();
