(function () {
  const user = RH.layout.app({ active: 'home' });
  if (!user) return;
  const { html, setHTML } = RH.ui;

  const MAX_FILES = 6;
  const MAX_BYTES = 25 * 1024 * 1024;
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
  const URGENCY = {
    low: ['Low', 'Whenever is convenient', 'fa-mug-hot'],
    normal: ['Normal', 'Within the next few days', 'fa-clock'],
    urgent: ['Urgent', 'As soon as possible', 'fa-bolt'],
  };
  const STEPS = ['Describe repair', 'Location', 'Review & submit'];

  const state = {
    step: 1,
    groups: [],
    parent: null,
    sub: null,
    files: [],
    urgency: 'normal',
    location: null,
    profile: null,
    itemTypeTouched: false,
    geoTried: false,
  };

  const $ = (id) => document.getElementById(id);
  const describeForm = $('form-describe');
  const locationForm = $('form-location');

  // ---------------------------------------------------------------- steps
  function renderStepper() {
    setHTML(
      'stepper',
      STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < state.step;
        const current = n === state.step;
        return html`<li class="flex items-center gap-2 ${n > 1 ? 'before:h-px before:w-6 before:bg-slate-200 sm:before:w-10' : ''}">
          <span class="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
            done || current ? 'bg-brand-600 text-white' : 'border border-slate-300 text-slate-400'
          }">${done ? html`<i class="fa-solid fa-check"></i>` : n}</span>
          <span class="hidden font-medium sm:inline ${current ? 'text-brand-600' : done ? 'text-ink' : 'text-slate-400'}">${label}</span>
        </li>`;
      })
    );
  }

  function goTo(step) {
    state.step = step;
    document.querySelectorAll('[data-step]').forEach((s) => (s.hidden = Number(s.dataset.step) !== step));
    renderStepper();
    if (step === 2 && !state.location && !state.geoTried) requestLocation();
    if (step === 3) renderReview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $('back-btn').addEventListener('click', () => (state.step > 1 ? goTo(state.step - 1) : history.back()));

  // ---------------------------------------------------------------- category
  const singular = (name) => name.split(/\s*&\s*/)[0].replace(/s$/i, '');

  function categoryId() {
    return (state.sub || state.parent || {})._id;
  }

  function renderCategoryCard() {
    const p = state.parent;
    if (!p) {
      setHTML('category-card', html`<span class="flex-1 text-sm text-slate-600">Choose what kind of device needs repair.</span>
        <button type="button" id="change-cat" class="btn-primary btn-sm">Choose category</button>`);
    } else {
      setHTML('category-card', html`${RH.ui.deviceTile(p.name, 'w-14 h-14 text-2xl')}
        <span class="min-w-0 flex-1">
          <span class="block font-semibold text-ink">${singular(p.name)} repair</span>
          <span class="block truncate text-xs text-slate-500">${p.children.length ? p.children.map((c) => c.name).join(', ') : 'All issues'}</span>
        </span>
        <button type="button" id="change-cat" class="btn-sm btn border border-slate-200 bg-white text-brand-600 hover:bg-brand-50"><i class="fa-solid fa-pen"></i>Change</button>`);
    }
    $('change-cat').addEventListener('click', openCategoryPicker);

    const select = $('subcategory');
    const children = p ? p.children : [];
    setHTML(select, html`<option value="">${children.length ? 'General / not sure' : 'Not applicable'}</option>
      ${children.map((c) => html`<option value="${c._id}" ${state.sub && state.sub._id === c._id ? RH.ui.raw('selected') : ''}>${c.name}</option>`)}`);
    select.disabled = !children.length;

    if (p && !state.itemTypeTouched) $('itemType').value = singular(p.name);
  }

  function setCategory(parent, sub) {
    state.parent = parent;
    state.sub = sub || null;
    renderCategoryCard();
    renderSummary();
  }

  function openCategoryPicker() {
    const m = RH.ui.modal(
      'Choose a category',
      html`<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        ${state.groups.map(
          (g) => html`<button type="button" data-id="${g._id}" class="flex flex-col items-center gap-2 rounded-xl border p-4 text-center text-sm font-medium transition hover:border-brand-200 ${
            state.parent && state.parent._id === g._id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-ink'
          }">${RH.ui.deviceTile(g.name, 'w-11 h-11 text-lg')}${g.name}</button>`
        )}
      </div>`,
      { wide: true }
    );
    m.el.querySelectorAll('[data-id]').forEach((b) =>
      b.addEventListener('click', () => {
        setCategory(state.groups.find((g) => g._id === b.dataset.id));
        m.close();
      })
    );
  }

  $('subcategory').addEventListener('change', (e) => {
    state.sub = state.parent.children.find((c) => c._id === e.target.value) || null;
    renderSummary();
  });
  $('itemType').addEventListener('input', () => {
    state.itemTypeTouched = true;
    renderSummary();
  });
  $('brandModel').addEventListener('input', renderSummary);
  $('problemDescription').addEventListener('input', (e) => ($('desc-count').textContent = e.target.value.length));

  // ---------------------------------------------------------------- media
  function addFiles(list) {
    for (const f of list) {
      if (state.files.length >= MAX_FILES) {
        RH.ui.toast(`You can attach up to ${MAX_FILES} files.`, 'error');
        break;
      }
      if (!ALLOWED.includes(f.type)) {
        RH.ui.toast(`${f.name}: only JPG, PNG, WEBP, MP4 or MOV files are allowed.`, 'error');
        continue;
      }
      if (f.size > MAX_BYTES) {
        RH.ui.toast(`${f.name} is larger than 25MB.`, 'error');
        continue;
      }
      state.files.push({ file: f, url: URL.createObjectURL(f) });
    }
    renderMedia();
  }

  function mediaThumb(item, i, removable) {
    const isVideo = item.file.type.startsWith('video/');
    return html`<li class="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      ${isVideo
        ? html`<span class="flex h-full w-full items-center justify-center text-xl text-slate-500"><i class="fa-solid fa-film"></i></span>`
        : html`<img src="${item.url}" alt="${item.file.name}" class="h-full w-full object-cover" />`}
      ${removable
        ? html`<button type="button" data-remove="${i}" class="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs text-slate-600 shadow hover:text-red-600" aria-label="Remove ${item.file.name}"><i class="fa-solid fa-xmark"></i></button>`
        : ''}
    </li>`;
  }

  function renderMedia() {
    setHTML('media-list', state.files.map((f, i) => mediaThumb(f, i, true)));
    document.querySelectorAll('[data-remove]').forEach((b) =>
      b.addEventListener('click', () => {
        const [removed] = state.files.splice(Number(b.dataset.remove), 1);
        URL.revokeObjectURL(removed.url);
        renderMedia();
      })
    );
  }

  $('media').addEventListener('change', (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  });
  const dz = $('dropzone');
  ['dragenter', 'dragover'].forEach((t) =>
    dz.addEventListener(t, (e) => {
      e.preventDefault();
      dz.classList.add('border-brand-600');
    })
  );
  ['dragleave', 'drop'].forEach((t) => dz.addEventListener(t, () => dz.classList.remove('border-brand-600')));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  });

  // ---------------------------------------------------------------- step 1 submit
  describeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    RH.ui.clearErrors(describeForm);
    let ok = true;
    if (!state.parent) {
      RH.ui.toast('Please choose a repair category.', 'error');
      ok = false;
    }
    if (!$('itemType').value.trim()) {
      RH.ui.fieldError(describeForm, 'itemType', 'Tell us what device this is.');
      ok = false;
    }
    if ($('problemDescription').value.trim().length < 10) {
      RH.ui.fieldError(describeForm, 'problemDescription', 'Please describe the problem in at least 10 characters.');
      ok = false;
    }
    if (ok) goTo(2);
  });

  // ---------------------------------------------------------------- step 2
  function renderUrgency() {
    setHTML(
      'urgency',
      Object.entries(URGENCY).map(
        ([key, [label, hint, icon]]) => html`<label class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
          state.urgency === key ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-brand-200'
        }">
          <input type="radio" name="urgency" value="${key}" class="mt-1 text-brand-600" ${state.urgency === key ? RH.ui.raw('checked') : ''} />
          <span><span class="flex items-center gap-2 text-sm font-semibold text-ink"><i class="fa-solid ${icon} text-brand-600"></i>${label}</span>
          <span class="mt-0.5 block text-xs text-slate-500">${hint}</span></span>
        </label>`
      )
    );
    document.querySelectorAll('input[name="urgency"]').forEach((r) =>
      r.addEventListener('change', () => {
        state.urgency = r.value;
        renderUrgency();
        renderSummary();
      })
    );
  }

  $('address').addEventListener('input', renderSummary);

  // Technicians find nearby jobs by map coordinates, so try to attach the customer's location.
  function requestLocation() {
    const status = $('geo-status');
    state.geoTried = true;
    if (!navigator.geolocation) {
      status.textContent = 'Location is not available in this browser. Nearby technicians may not see your request first.';
      return;
    }
    status.textContent = 'Getting your location so nearby technicians can find this request…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.location = { lng: pos.coords.longitude, lat: pos.coords.latitude };
        status.textContent = 'Location added. Technicians near you will see this request.';
      },
      () => {
        status.textContent = "Location not shared. You can still continue, but technicians searching nearby won't see this request.";
      },
      { timeout: 10000 }
    );
  }

  $('geo-btn').addEventListener('click', requestLocation);

  locationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    RH.ui.clearErrors(locationForm);
    if (!$('address').value.trim()) {
      RH.ui.fieldError(locationForm, 'address', 'Enter the address where the repair should happen.');
      return;
    }
    goTo(3);
  });

  // ---------------------------------------------------------------- step 3
  function reviewSection(title, subtitle, icon, step, body) {
    return html`<section class="card p-5">
      <div class="flex items-start gap-3">
        <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"><i class="fa-solid ${icon}"></i></span>
        <div class="min-w-0 flex-1"><h2 class="font-semibold text-ink">${title}</h2><p class="text-xs text-slate-500">${subtitle}</p></div>
        <button type="button" data-edit="${step}" class="btn-sm btn border border-slate-200 text-brand-600 hover:bg-brand-50"><i class="fa-solid fa-pen"></i>Edit</button>
      </div>
      <div class="mt-4 border-t border-slate-100 pt-4">${body}</div>
    </section>`;
  }

  const kv = (k, v) => html`<div><p class="text-xs text-slate-500">${k}</p><p class="text-sm font-semibold text-ink">${v || '—'}</p></div>`;

  function renderReview() {
    const [uLabel] = URGENCY[state.urgency];
    setHTML(
      'review',
      html`${reviewSection('Repair details', "Here's the information about your device and the issue", 'fa-clipboard-list', 1, html`
          <div class="grid gap-4 sm:grid-cols-3">
            ${kv('Category', state.sub ? `${state.parent.name} · ${state.sub.name}` : state.parent.name)}
            ${kv('Device', $('itemType').value.trim())}
            ${kv('Brand & model', $('brandModel').value.trim())}
          </div>
          <p class="mt-4 text-xs text-slate-500">Problem description</p>
          <p class="whitespace-pre-line text-sm text-ink">${$('problemDescription').value.trim()}</p>
          ${state.files.length
            ? html`<p class="mt-4 text-xs text-slate-500">Uploaded media (${state.files.length})</p>
                <ul class="mt-2 flex flex-wrap gap-3">${state.files.map((f, i) => mediaThumb(f, i, false))}</ul>`
            : ''}`)}
        ${reviewSection('Location & urgency', 'This is where the repair should be done', 'fa-location-dot', 2, html`
          <div class="grid gap-4 sm:grid-cols-2">
            ${kv('Address', $('address').value.trim())}
            ${kv('Urgency', uLabel)}
          </div>`)}
        <div class="card p-5">
          <p class="flex gap-2 text-sm text-slate-600"><i class="fa-solid fa-tag mt-0.5 text-brand-600"></i>The repair price will be quoted by technicians. You'll receive offers shortly after you submit.</p>
          <button type="button" id="submit-btn" class="btn-primary mt-4 w-full">Submit repair request <i class="fa-solid fa-arrow-right"></i></button>
          <p class="mt-2 text-center text-xs text-slate-500"><i class="fa-solid fa-lock mr-1"></i>Your information is safe and secure</p>
        </div>`
    );
    document.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => goTo(Number(b.dataset.edit))));
    $('submit-btn').addEventListener('click', submit);
  }

  async function submit() {
    const btn = $('submit-btn');
    await RH.ui.withLoading(btn, async () => {
      const fd = new FormData();
      fd.append('serviceCategoryId', categoryId());
      fd.append('itemType', $('itemType').value.trim());
      if ($('brandModel').value.trim()) fd.append('brandModel', $('brandModel').value.trim());
      fd.append('problemDescription', $('problemDescription').value.trim());
      fd.append('urgency', state.urgency);
      fd.append('address', $('address').value.trim());
      if (state.location) fd.append('location', JSON.stringify(state.location));
      state.files.forEach((f) => fd.append('media', f.file));

      try {
        const { data } = await RH.api.repairRequests.create(fd);
        if ($('save-address').checked && state.profile) {
          const body = { address: $('address').value.trim() };
          if (state.location) body.location = state.location;
          await RH.api.customerProfile.update(state.profile._id, body).catch(() => {});
        }
        RH.go('customer/request-submitted.html', { id: data._id });
      } catch (err) {
        const fieldStep = { serviceCategoryId: 1, itemType: 1, brandModel: 1, problemDescription: 1, address: 2, urgency: 2 };
        const first = (err.errors || [])[0];
        if (first && fieldStep[first.field]) {
          goTo(fieldStep[first.field]);
          RH.ui.showFormError(fieldStep[first.field] === 1 ? describeForm : locationForm, err);
        } else if (err.status >= 500 && state.files.length) {
          RH.ui.toast("We couldn't upload your photos or videos. Please try again, or remove them and submit without media.", 'error');
        } else {
          RH.ui.toast(err.message, 'error');
        }
      }
    }, state.files.length ? 'Uploading…' : 'Submitting…');
  }

  // ---------------------------------------------------------------- summary
  function renderSummary() {
    const row = (icon, k, v) =>
      html`<div class="flex items-start justify-between gap-3 py-2 text-sm"><span class="flex items-center gap-2 text-slate-500"><i class="fa-solid ${icon} w-4 text-slate-400"></i>${k}</span><span class="text-right font-medium text-ink">${v || '—'}</span></div>`;
    setHTML(
      'summary',
      html`${state.parent
          ? html`<div class="mb-3 flex items-center gap-3 rounded-xl bg-brand-50 p-3">${RH.ui.deviceTile(state.parent.name, 'w-11 h-11 text-lg')}
              <span class="text-sm font-semibold text-ink">${singular(state.parent.name)} repair</span></div>`
          : ''}
        <div class="divide-y divide-slate-100">
          ${row('fa-tag', 'Category', state.parent && state.parent.name)}
          ${row('fa-wrench', 'Issue type', state.sub && state.sub.name)}
          ${row('fa-mobile-screen', 'Device', $('itemType').value.trim())}
          ${row('fa-barcode', 'Brand & model', $('brandModel').value.trim())}
          ${row('fa-location-dot', 'Address', $('address').value.trim())}
          ${row('fa-gauge-high', 'Urgency', URGENCY[state.urgency][0])}
        </div>`
    );
  }

  // ---------------------------------------------------------------- init
  async function init() {
    renderStepper();
    renderUrgency();
    setHTML('category-card', RH.ui.spinner(''));
    try {
      const [groups, profile] = await Promise.all([
        RH.data.categoryTree(),
        RH.api.customerProfile.me().then((r) => r.data).catch(() => null),
      ]);
      state.groups = groups;
      state.profile = profile;
      if (profile && profile.address) $('address').value = profile.address;
      const saved = profile && profile.location && profile.location.coordinates;
      if (saved && (saved[0] || saved[1])) {
        state.location = { lng: saved[0], lat: saved[1] };
        $('geo-status').textContent = 'Using the location saved with your default address.';
      }

      if (!groups.length) {
        setHTML(describeForm, RH.ui.emptyState('fa-layer-group', 'No repair categories yet', 'Repair categories have not been set up on the server yet, so requests cannot be created right now.'));
        return;
      }

      const wanted = RH.param('category');
      let parent = groups.find((g) => g._id === wanted);
      let sub = null;
      if (!parent && wanted) {
        parent = groups.find((g) => g.children.some((c) => c._id === wanted));
        sub = parent && parent.children.find((c) => c._id === wanted);
      }
      setCategory(parent || null, sub);
      if (!parent) openCategoryPicker();
    } catch (e) {
      setHTML(describeForm, RH.ui.errorState(e.message, true));
    }
    renderSummary();
  }

  init();
})();
