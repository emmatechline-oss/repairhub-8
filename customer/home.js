(function () {
  const user = RH.layout.app({ active: 'home' });
  if (!user) return;
  const { html, setHTML } = RH.ui;

  document.getElementById('greeting').textContent = `Hi ${user.fullName.split(' ')[0]}, welcome back`;

  async function loadCategories() {
    setHTML('categories', RH.ui.spinner());
    try {
      const groups = await RH.data.categoryTree();
      if (!groups.length) {
        setHTML('categories', RH.ui.emptyState('fa-layer-group', 'No repair categories yet', 'Repair categories have not been set up on the server yet, so requests cannot be created. Please check back soon.'));
        return;
      }
      setHTML(
        'categories',
        html`<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          ${groups.map(
            (g) => html`<a href="${RH.url('customer/request-repair.html', { category: g._id })}" class="card group flex flex-col items-center gap-3 p-5 text-center transition hover:border-brand-200 hover:shadow-md">
              ${RH.ui.deviceTile(g.name, 'w-14 h-14 text-2xl')}
              <span class="text-sm font-semibold text-ink group-hover:text-brand-600">${g.name}</span>
              ${g.children.length ? html`<span class="text-xs text-slate-500">${g.children.map((c) => c.name).join(', ')}</span>` : ''}
            </a>`
          )}
        </div>`
      );
    } catch (e) {
      setHTML('categories', RH.ui.errorState(e.message, true));
    }
  }

  async function loadActive() {
    setHTML('active', RH.ui.spinner());
    try {
      const [{ data: requests }, { data: jobs }] = await Promise.all([
        RH.api.repairRequests.list({ limit: 50 }),
        RH.api.jobs.list({ limit: 50 }),
      ]);
      const active = requests.filter((r) => ['open', 'quoted', 'booked', 'in_progress'].includes(r.status)).slice(0, 4);
      if (!active.length) {
        setHTML('active', RH.ui.emptyState('fa-screwdriver-wrench', 'No active repairs', 'When you request a repair, you can follow its progress here.'));
        return;
      }
      const jobFor = (r) => jobs.find((j) => j.repairRequestId && String(j.repairRequestId._id) === String(r._id) && j.status !== 'cancelled');
      setHTML(
        'active',
        html`<div class="grid gap-3 md:grid-cols-2">
          ${active.map((r) => {
            const job = jobFor(r);
            const href = job
              ? RH.url('customer/repair-details.html', { job: job._id })
              : RH.url('customer/quotations.html', { request: r._id });
            return html`<a href="${href}" class="card flex items-center gap-4 p-4 transition hover:shadow-md">
              ${RH.ui.deviceTile(r.itemType || (r.serviceCategoryId && r.serviceCategoryId.name), 'w-12 h-12 text-xl')}
              <span class="min-w-0 flex-1">
                <span class="block truncate font-semibold text-ink">${RH.data.requestTitle(r)}</span>
                <span class="block truncate text-xs text-slate-500">${r.brandModel || (r.serviceCategoryId && r.serviceCategoryId.name) || ''}</span>
              </span>
              ${RH.ui.badge(job ? job.status : r.status)}
            </a>`;
          })}
        </div>`
      );
    } catch (e) {
      setHTML('active', RH.ui.errorState(e.message, true));
    }
  }

  loadCategories();
  loadActive();
})();
