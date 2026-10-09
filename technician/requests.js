(function () {
  const user = RH.layout.app({ active: 'requests', roles: ['technician', 'service_center'] });
  if (!user) return;
  const { html, setHTML } = RH.ui;

  const $ = (id) => document.getElementById(id);
  const URGENCY = { urgent: ['Urgent', 'red'], normal: ['Normal', 'slate'], low: ['Low', 'slate'] };
  const NEAR_KEY = 'rh_tech_near';
  let profile = null;
  let origin = null; // { lng, lat } the list is measured from
  let quotedIds = new Set();
  let items = [];
  let page = 1;
  let team = []; // repair shops quote on behalf of a team member

  // Remember the location filter between visits (per browser).
  try {
    const saved = JSON.parse(localStorage.getItem(NEAR_KEY) || '{}');
    if (saved.near) $('near').value = saved.near;
    if (saved.radius) $('radius').value = saved.radius;
  } catch (e) {
    /* ignore */
  }
  const remember = () => {
    try {
      localStorage.setItem(NEAR_KEY, JSON.stringify({ near: $('near').value, radius: $('radius').value }));
    } catch (e) {
      /* ignore */
    }
  };

  async function resolveOrigin() {
    const near = $('near').value;
    const note = $('near-note');
    origin = null;
    if (near === 'base') {
      origin = RH.tech.base(profile);
      if (!origin) {
        note.innerHTML = String(html`You haven't set a base location yet. <a class="font-medium text-brand-600 hover:underline" href="${RH.tech.profileUrl()}">Set it on your profile</a>, or use your current location.`);
        return false;
      }
    } else if (near === 'current') {
      note.textContent = 'Getting your location…';
      try {
        origin = await RH.tech.currentLocation();
      } catch (e) {
        note.textContent = `${e.message} Showing requests from anywhere instead.`;
        return false;
      }
    }
    note.textContent = origin
      ? "Only requests where the customer shared their location can be matched by distance. Switch to \"Anywhere\" to see all requests."
      : 'Showing requests from anywhere in your categories, newest first.';
    return true;
  }

  function card(r) {
    const cat = r.serviceCategoryId && r.serviceCategoryId.name;
    const [uLabel, uTone] = URGENCY[r.urgency] || URGENCY.normal;
    const km = RH.tech.distanceKm(origin, RH.tech.point(r.location));
    const quoted = quotedIds.has(String(r._id));
    return html`<article class="card p-5">
      <div class="flex flex-wrap items-start gap-4">
        ${RH.ui.deviceTile(r.itemType || cat, 'w-14 h-14 text-2xl')}
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-ink">${r.itemType ? `${r.itemType} repair` : 'Repair request'}${r.brandModel ? ` · ${r.brandModel}` : ''}</p>
          <p class="text-sm text-slate-500">${cat || ''}${cat ? ' · ' : ''}posted ${RH.ui.timeAgo(r.createdAt)}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          ${RH.ui.toneBadge(uLabel, uTone)}
          ${r.status === 'quoted' ? RH.ui.toneBadge('Has quotes', 'blue') : RH.ui.toneBadge('No quotes yet', 'green')}
        </div>
      </div>
      <p class="mt-4 whitespace-pre-line text-sm text-slate-700">${r.problemDescription}</p>
      ${r.mediaUrls && r.mediaUrls.length
        ? html`<div class="mt-3 flex flex-wrap gap-2">${r.mediaUrls.map((u) => /\.(mp4|mov)$/i.test(u)
            ? html`<a href="${u}" target="_blank" rel="noopener" class="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><i class="fa-solid fa-film"></i></a>`
            : html`<a href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="Customer photo" class="h-16 w-16 rounded-lg object-cover" /></a>`)}</div>`
        : ''}
      <div class="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-slate-600"><i class="fa-solid fa-location-dot mr-1 text-slate-400"></i>${r.address || 'No address given'}
          ${km !== null ? html`<span class="ml-2 font-medium text-brand-700">${RH.tech.formatKm(km)}</span>` : ''}</p>
        ${quoted
          ? html`<a href="${RH.url('technician/quotes.html')}" class="btn-outline btn-sm"><i class="fa-solid fa-check"></i>Quote sent</a>`
          : html`<button data-quote="${r._id}" class="btn-primary btn-sm"><i class="fa-solid fa-file-invoice-dollar"></i>Send quote</button>`}
      </div>
    </article>`;
  }

  function openQuote(r) {
    if (RH.tech.isCenter() && !team.length) {
      RH.ui.toast('Add a technician to your team before sending quotes.', 'error');
      return;
    }
    const m = RH.ui.modal(`Quote: ${r.itemType || 'repair'}${r.brandModel ? ` · ${r.brandModel}` : ''}`, html`<form class="space-y-4" novalidate>
      <p data-form-error class="hidden rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"></p>
      <p class="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">${r.problemDescription}</p>
      ${RH.tech.isCenter()
        ? html`<div><label for="technicianId" class="label">Technician who will do the work</label>
            <select id="technicianId" name="technicianId" class="input">${team.map((t) => html`<option value="${t._id}">${RH.data.techName(t)}${t.verificationStatus === 'verified' ? '' : ' (not verified)'}</option>`)}</select></div>`
        : ''}
      <div class="grid gap-3 sm:grid-cols-2">
        <div><label for="laborCost" class="label">Labour (₦)</label><input id="laborCost" name="laborCost" type="number" min="0" step="100" class="input" placeholder="15000" /></div>
        <div><label for="partsCost" class="label">Parts (₦)</label><input id="partsCost" name="partsCost" type="number" min="0" step="100" class="input" placeholder="3000" /></div>
      </div>
      <p class="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3 text-sm"><span class="text-slate-600">Total the customer pays</span><b id="total" class="text-lg text-brand-700">₦0</b></p>
      <div class="grid gap-3 sm:grid-cols-3">
        <div><label for="estimatedDays" class="label">Repair time (days)</label><input id="estimatedDays" name="estimatedDays" type="number" min="0" max="365" value="1" class="input" /></div>
        <div><label for="warrantyDays" class="label">Warranty (days)</label><input id="warrantyDays" name="warrantyDays" type="number" min="0" max="730" value="30" class="input" /></div>
        <div><label for="validDays" class="label">Quote valid (days)</label><input id="validDays" name="validDays" type="number" min="1" max="30" value="7" class="input" /></div>
      </div>
      <div><label for="notes" class="label">Notes for the customer <span class="font-normal text-slate-400">(optional)</span></label>
        <textarea id="notes" name="notes" rows="3" maxlength="1000" class="input resize-y" placeholder="What you'll do, parts quality, anything the customer should know"></textarea></div>
      <div class="flex justify-end gap-3"><button type="button" data-close class="btn-ghost btn-sm">Cancel</button><button type="submit" class="btn-primary btn-sm">Send quote</button></div>
    </form>`, { wide: true });

    const form = m.el.querySelector('form');
    const num = (name) => Math.max(Number(form[name].value) || 0, 0);
    const updateTotal = () => (m.el.querySelector('#total').textContent = RH.ui.money(num('laborCost') + num('partsCost')));
    ['laborCost', 'partsCost'].forEach((n) => form[n].addEventListener('input', updateTotal));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      RH.ui.clearErrors(form);
      const laborCost = num('laborCost');
      const partsCost = num('partsCost');
      if (laborCost + partsCost < 1) return RH.ui.fieldError(form, 'laborCost', 'Enter your labour and/or parts cost.');
      const body = {
        repairRequestId: r._id,
        laborCost,
        partsCost,
        estimatedDays: Math.round(num('estimatedDays')),
        warrantyDays: Math.round(num('warrantyDays')),
        validDays: Math.min(Math.max(Math.round(num('validDays')) || 7, 1), 30),
      };
      if (form.notes.value.trim()) body.notes = form.notes.value.trim();
      if (RH.tech.isCenter()) body.technicianId = form.technicianId.value;
      await RH.ui.withLoading(form.querySelector('[type=submit]'), async () => {
        try {
          await RH.api.quotations.submit(body);
          m.close();
          RH.ui.toast('Quote sent. The customer has been notified.', 'success');
          load();
        } catch (err) {
          RH.ui.showFormError(form, err.status === 409 && /duplicate/i.test(err.message) ? new RH.ApiError('You have already sent a quote for this request.', 409) : err);
        }
      }, 'Sending…');
    });
  }

  async function load() {
    setHTML('list', RH.ui.spinner());
    setHTML('pager', '');
    remember();
    try {
      if (!profile) {
        profile = await RH.tech.profile();
        const cats = await RH.data.categoryTree().catch(() => []);
        const mine = (profile.serviceCategoryIds || []).map(String);
        const flat = cats.flatMap((g) => [g, ...g.children]).filter((c) => !mine.length || mine.includes(String(c._id)));
        setHTML('category', html`<option value="">${mine.length ? 'All my categories' : 'All categories'}</option>${flat.map((c) => html`<option value="${c._id}">${c.parentCategory ? `${c.parentCategory} · ` : ''}${c.name}</option>`)}`);
        if (RH.tech.isCenter()) team = await RH.api.serviceCenters.team(profile._id).then((r) => r.data).catch(() => []);
        if (!RH.tech.isVerified(profile)) {
          setHTML('banner', html`<p class="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800"><i class="fa-solid fa-hourglass-half mt-0.5"></i>
            <span>Job requests appear once an admin verifies your account. <a class="font-semibold underline" href="${RH.url(RH.auth.homeFor(user.role))}">Upload your documents</a> if you haven't yet.</span></p>`);
        } else if (!mine.length) {
          setHTML('banner', html`<p class="flex gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-700"><i class="fa-solid fa-circle-info mt-0.5"></i>
            <span>You're seeing requests from every category. <a class="font-semibold underline" href="${RH.tech.profileUrl()}">Choose your service categories</a> to only see the repairs you do.</span></p>`);
        }
      }
      await resolveOrigin();
      const query = { page, limit: 20, serviceCategoryId: $('category').value };
      if (origin) Object.assign(query, { lng: origin.lng, lat: origin.lat, radiusKm: $('radius').value });
      const [res, mine] = await Promise.all([
        RH.api.repairRequests.list(query),
        RH.api.quotations.mine().then((r) => r.data).catch(() => []),
      ]);
      // One quote per technician per request (even after withdrawing), so any quote counts.
      quotedIds = new Set(mine.map((q) => String((q.repairRequestId && q.repairRequestId._id) || q.repairRequestId)));
      items = res.data;
      if (origin) items.sort((a, b) => (RH.tech.distanceKm(origin, RH.tech.point(a.location)) || 1e9) - (RH.tech.distanceKm(origin, RH.tech.point(b.location)) || 1e9));

      if (!items.length) {
        const text = !RH.tech.isVerified(profile)
          ? 'Requests will show here after your account is verified.'
          : origin
          ? `No open requests within ${$('radius').value} km. Try a larger distance or "Anywhere".`
          : 'There are no open requests in your categories right now. New ones will also appear in your notifications.';
        setHTML('list', RH.ui.emptyState('fa-inbox', 'No job requests', text));
        return;
      }
      setHTML('list', items.map(card));
      setHTML('pager', RH.ui.pager(res.meta));
      document.querySelectorAll('[data-quote]').forEach((b) => b.addEventListener('click', () => openQuote(items.find((x) => x._id === b.dataset.quote))));
      document.querySelectorAll('#pager [data-page]').forEach((b) => b.addEventListener('click', () => { page = Number(b.dataset.page); load(); }));
    } catch (e) {
      setHTML('list', RH.ui.errorState(e.message, true));
    }
  }

  $('filters').addEventListener('submit', (e) => { e.preventDefault(); page = 1; load(); });
  ['near', 'radius', 'category'].forEach((id) => $(id).addEventListener('change', () => { page = 1; load(); }));
  load();
})();
