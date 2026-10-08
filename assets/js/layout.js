/**
 * Page chrome.
 *  - RH.layout.app({ active, roles })  wraps <main id="page-content"> in the sidebar + top bar shell
 *    for the given roles (default: customer). The sidebar shown depends on the user's role.
 *  - RH.layout.authHero()       fills #auth-hero on the login / sign-up pages.
 *  - RH.flash / RH.layout.showFlash  carry a toast message across a redirect.
 */
(function () {
  const { html } = RH.ui;

  // Sidebar per role; the first two entries also appear in the top bar.
  const NAVS = {
    customer: [
      { key: 'home', label: 'Home', icon: 'fa-house', href: 'customer/home.html' },
      { key: 'repairs', label: 'My Repairs', icon: 'fa-screwdriver-wrench', href: 'customer/my-repairs.html' },
      { key: 'wallet', label: 'Wallet', icon: 'fa-wallet', href: 'customer/wallet.html' },
      { key: 'settings', label: 'Settings', icon: 'fa-gear', href: 'customer/settings.html' },
    ],
    technician: [
      { key: 'overview', label: 'Overview', icon: 'fa-house', href: 'technician/home.html' },
      { key: 'requests', label: 'Job requests', icon: 'fa-inbox', href: 'technician/requests.html' },
      { key: 'quotes', label: 'My quotes', icon: 'fa-file-invoice-dollar', href: 'technician/quotes.html' },
      { key: 'jobs', label: 'My jobs', icon: 'fa-screwdriver-wrench', href: 'technician/jobs.html' },
      { key: 'wallet', label: 'Wallet', icon: 'fa-wallet', href: 'technician/wallet.html' },
      { key: 'profile', label: 'Profile', icon: 'fa-id-card', href: 'technician/profile.html' },
      { key: 'settings', label: 'Settings', icon: 'fa-gear', href: 'customer/settings.html' },
    ],
    service_center: [
      { key: 'overview', label: 'Overview', icon: 'fa-store', href: 'technician/home.html' },
      { key: 'requests', label: 'Job requests', icon: 'fa-inbox', href: 'technician/requests.html' },
      { key: 'quotes', label: 'Quotes', icon: 'fa-file-invoice-dollar', href: 'technician/quotes.html' },
      { key: 'jobs', label: 'Jobs', icon: 'fa-screwdriver-wrench', href: 'technician/jobs.html' },
      { key: 'team', label: 'Team', icon: 'fa-users-gear', href: 'center/team.html' },
      { key: 'wallet', label: 'Wallet', icon: 'fa-wallet', href: 'technician/wallet.html' },
      { key: 'profile', label: 'Shop profile', icon: 'fa-id-card', href: 'center/profile.html' },
      { key: 'settings', label: 'Settings', icon: 'fa-gear', href: 'customer/settings.html' },
    ],
    admin: [
      { key: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line', href: 'admin/dashboard.html' },
      { key: 'verifications', label: 'Verifications', icon: 'fa-user-check', href: 'admin/verifications.html' },
      { key: 'disputes', label: 'Disputes', icon: 'fa-scale-balanced', href: 'admin/disputes.html' },
      { key: 'withdrawals', label: 'Withdrawals', icon: 'fa-money-bill-transfer', href: 'admin/withdrawals.html' },
      { key: 'users', label: 'Users', icon: 'fa-users', href: 'admin/users.html' },
      { key: 'categories', label: 'Categories', icon: 'fa-layer-group', href: 'admin/categories.html' },
      { key: 'settings', label: 'Settings', icon: 'fa-gear', href: 'customer/settings.html' },
    ],
  };

  // Where a notification should take the customer, based on what its refId points at.
  function notificationTarget(n, role) {
    if (role === 'technician' || role === 'service_center') {
      const page = { repair_request: 'requests', quotation: 'quotes', appointment: 'jobs', status_update: 'jobs', warranty: 'jobs', dispute: 'jobs', payment: 'wallet' }[n.type];
      return RH.url(page ? `technician/${page}.html` : RH.auth.homeFor(role));
    }
    if (role === 'admin') return n.type === 'dispute' ? RH.url('admin/disputes.html') : null;
    if (n.type === 'payment' && !n.refId) return RH.url('customer/wallet.html'); // wallet top-ups and refunds
    if (!n.refId) return null;
    if (n.type === 'dispute') return RH.url('customer/my-repairs.html'); // refId is the dispute, not the job
    if (['status_update', 'appointment', 'payment'].includes(n.type)) {
      return RH.url('customer/repair-details.html', { job: n.refId });
    }
    if (n.type === 'warranty') return RH.url('customer/warranty.html', { id: n.refId });
    if (n.type === 'quotation') return RH.url('customer/my-repairs.html');
    return null;
  }

  const NOTIF_ICON = {
    quotation: 'fa-file-invoice-dollar',
    appointment: 'fa-calendar-check',
    status_update: 'fa-screwdriver-wrench',
    payment: 'fa-wallet',
    warranty: 'fa-shield-halved',
    review: 'fa-star',
    dispute: 'fa-scale-balanced',
  };

  function sidebar(active, nav, role) {
    return html`
      <a href="${RH.url(RH.auth.homeFor(role))}" class="mb-8 flex items-center px-2">
        <img src="${RH.config.LOGO_URL}" alt="RepairHub" class="h-10 w-auto" />
      </a>
      <nav class="space-y-1.5" aria-label="Main">
        ${nav.map(
          (item) => html`<a href="${RH.url(item.href)}" class="nav-link ${item.key === active ? 'nav-link-active' : ''}" ${
            item.key === active ? RH.ui.raw('aria-current="page"') : ''
          }>
            <i class="fa-solid ${item.icon} w-5 text-center"></i><span>${item.label}</span></a>`
        )}
      </nav>
      ${role === 'customer'
        ? html`<div class="mt-auto rounded-2xl bg-white p-4 shadow-sm">
            <p class="text-sm font-semibold text-ink">Need a repair?</p>
            <p class="mt-1 text-xs text-slate-500">Describe the problem and get quotes from verified technicians.</p>
            <a href="${RH.url('customer/request-repair.html')}" class="btn-outline btn-sm mt-3 w-full"><i class="fa-solid fa-plus"></i>Request a repair</a>
          </div>`
        : html`<p class="mt-auto px-2 text-xs text-slate-400">Signed in as ${{ admin: 'administrator', technician: 'technician', service_center: 'repair shop' }[role] || role}</p>`}`;
  }

  function topbar(user, active, nav) {
    const first = (user.fullName || '').split(' ')[0];
    return html`
      <div class="flex h-16 items-center gap-3 px-4 lg:px-8">
        <button id="rh-menu-btn" class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu"><i class="fa-solid fa-bars text-lg"></i></button>
        <nav class="hidden items-center gap-8 text-sm md:flex" aria-label="Top">
          ${nav.slice(0, 2).map(
            (item) => html`<a href="${RH.url(item.href)}" class="${
              item.key === active ? 'border-b-2 border-brand-600 py-5 font-semibold text-brand-600' : 'py-5 text-slate-500 hover:text-ink'
            }">${item.label}</a>`
          )}
        </nav>
        <div class="ml-auto flex items-center gap-2 sm:gap-4">
          <div class="relative">
            <button id="rh-notif-btn" class="relative rounded-full p-2.5 text-slate-600 hover:bg-slate-100" aria-label="Notifications" aria-expanded="false">
              <i class="fa-regular fa-bell text-xl"></i>
              <span id="rh-notif-badge" class="absolute right-1 top-1 hidden h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"></span>
            </button>
            <div id="rh-notif-panel" class="absolute right-0 z-50 mt-2 hidden w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p class="text-sm font-semibold text-ink">Notifications</p>
                <button id="rh-notif-readall" class="text-xs font-medium text-brand-600 hover:underline">Mark all as read</button>
              </div>
              <div id="rh-notif-list" class="max-h-96 divide-y divide-slate-100 overflow-y-auto">${RH.ui.spinner('')}</div>
            </div>
          </div>
          <span class="hidden h-8 w-px bg-slate-200 sm:block"></span>
          <div class="relative">
            <button id="rh-user-btn" class="flex items-center gap-2.5 rounded-full p-1 pr-2 hover:bg-slate-100" aria-expanded="false">
              ${RH.ui.avatar(user.fullName, 'w-9 h-9 text-sm')}
              <span class="hidden text-sm font-semibold text-ink sm:inline">${first}</span>
              <i class="fa-solid fa-chevron-down hidden text-xs text-slate-500 sm:inline"></i>
            </button>
            <div id="rh-user-panel" class="absolute right-0 z-50 mt-2 hidden w-60 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
              <div class="border-b border-slate-100 px-4 pb-3 pt-1">
                <p class="truncate text-sm font-semibold text-ink">${user.fullName}</p>
                <p class="truncate text-xs text-slate-500">${user.email}</p>
              </div>
              <a href="${RH.url('customer/settings.html')}" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-brand-50"><i class="fa-solid fa-gear w-4 text-slate-400"></i>Settings</a>
              <button id="rh-logout" class="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"><i class="fa-solid fa-arrow-right-from-bracket w-4"></i>Log out</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderNotifications(items) {
    const list = document.getElementById('rh-notif-list');
    if (!items.length) {
      RH.ui.setHTML(list, html`<p class="px-4 py-10 text-center text-sm text-slate-500">You're all caught up.</p>`);
      return;
    }
    RH.ui.setHTML(
      list,
      items.map(
        (n) => html`<button data-id="${n._id}" class="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-brand-50/60 ${n.isRead ? '' : 'bg-brand-50/40'}">
          <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs text-brand-600"><i class="fa-solid ${NOTIF_ICON[n.type] || 'fa-bell'}"></i></span>
          <span class="flex-1">
            <span class="block text-sm ${n.isRead ? 'text-slate-600' : 'font-medium text-ink'}">${n.message}</span>
            <span class="mt-0.5 block text-xs text-slate-400">${RH.ui.timeAgo(n.createdAt)}</span>
          </span>
          ${n.isRead ? '' : html`<span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600"></span>`}
        </button>`
      )
    );
    list.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const n = items.find((x) => x._id === btn.dataset.id);
        if (!n.isRead) await RH.api.notifications.markRead(n._id).catch(() => {});
        const target = notificationTarget(n, (RH.auth.getUser() || {}).role);
        if (target) location.href = target;
        else loadNotifications();
      });
    });
  }

  function setUnread(count) {
    const badge = document.getElementById('rh-notif-badge');
    if (!badge) return;
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.classList.toggle('hidden', !count);
    badge.classList.toggle('inline-flex', !!count);
  }

  async function loadNotifications() {
    try {
      const { data, meta } = await RH.api.notifications.list({ limit: 10 });
      renderNotifications(data || []);
      setUnread((meta && meta.unreadCount) || 0);
    } catch (e) {
      RH.ui.setHTML('rh-notif-list', html`<p class="px-4 py-8 text-center text-sm text-slate-500">${e.message}</p>`);
    }
  }

  function bindDropdown(btnId, panelId) {
    const btn = document.getElementById(btnId);
    const panel = document.getElementById(panelId);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = panel.classList.contains('hidden');
      document.querySelectorAll('#rh-notif-panel, #rh-user-panel').forEach((p) => p.classList.add('hidden'));
      panel.classList.toggle('hidden', !open);
      btn.setAttribute('aria-expanded', String(open));
    });
    panel.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => {
      panel.classList.add('hidden');
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  /**
   * Build the logged-in customer shell around <main id="page-content">.
   * Returns the current user (or null when the visitor is being redirected to log in).
   */
  function app({ active, roles = ['customer'] } = {}) {
    const user = RH.auth.require(roles);
    const nav = NAVS[user && user.role] || NAVS.customer;
    if (!user) return null;

    const content = document.getElementById('page-content');
    const shell = document.createElement('div');
    shell.className = 'flex min-h-screen';
    shell.innerHTML = String(html`
      <div id="rh-overlay" class="fixed inset-0 z-40 hidden bg-ink/40 lg:hidden"></div>
      <aside id="rh-sidebar" class="fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col bg-brand-50 p-5 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0">
        ${sidebar(active, nav, user.role)}
      </aside>
      <div class="flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">${topbar(user, active, nav)}</header>
        <div id="rh-main" class="flex-1 px-4 py-6 lg:px-8"></div>
      </div>`);
    document.body.prepend(shell);
    shell.querySelector('#rh-main').appendChild(content);
    content.hidden = false;

    // Mobile sidebar
    const sidebarEl = shell.querySelector('#rh-sidebar');
    const overlay = shell.querySelector('#rh-overlay');
    const toggle = (open) => {
      sidebarEl.classList.toggle('-translate-x-full', !open);
      overlay.classList.toggle('hidden', !open);
    };
    shell.querySelector('#rh-menu-btn').addEventListener('click', () => toggle(true));
    overlay.addEventListener('click', () => toggle(false));

    bindDropdown('rh-notif-btn', 'rh-notif-panel');
    bindDropdown('rh-user-btn', 'rh-user-panel');
    shell.querySelector('#rh-logout').addEventListener('click', () => RH.auth.logout());
    shell.querySelector('#rh-notif-readall').addEventListener('click', async () => {
      await RH.api.notifications.markAllRead().catch(() => {});
      loadNotifications();
    });
    loadNotifications();
    showFlash();
    return user;
  }

  /** Left marketing panel shared by role selection, login and sign-up. */
  function authHero() {
    const el = document.getElementById('auth-hero');
    if (!el) return;
    const features = [
      ['fa-shield-halved', 'Trusted technicians'],
      ['fa-bolt', 'Transparent pricing'],
      ['fa-location-dot', 'Convenient locations'],
    ];
    const devices = [
      ['fa-laptop', 'col-span-2 row-span-2 text-7xl'],
      ['fa-mobile-screen-button', 'text-4xl'],
      ['fa-tablet-screen-button', 'text-4xl'],
      ['fa-gamepad', 'text-4xl'],
      ['fa-headphones', 'text-4xl'],
    ];
    el.innerHTML = String(html`
      <div class="flex h-full flex-col gap-8 p-8 lg:p-12">
        <a href="${RH.url('auth/role.html')}"><img src="${RH.config.LOGO_URL}" alt="RepairHub" class="h-11 w-auto" /></a>
        <div>
          <h1 class="text-4xl font-bold leading-tight text-ink xl:text-5xl">Get your devices repaired, <span class="text-brand-600">the easy way.</span></h1>
          <p class="mt-4 max-w-md text-slate-600">RepairHub connects you with trusted technicians for fast, reliable, and affordable device repairs.</p>
        </div>
        <ul class="flex flex-wrap gap-x-6 gap-y-3">
          ${features.map(
            ([icon, label]) => html`<li class="flex items-center gap-2 text-sm font-medium text-ink"><span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white"><i class="fa-solid ${icon} text-xs"></i></span>${label}</li>`
          )}
        </ul>
        <!-- Image slot RH.images.authHero (devices photo); the icon collage shows until it exists. -->
        <div class="mt-auto">
          ${RH.ui.slotImage(
            RH.images.authHero,
            'Laptop, phone, tablet and game controller waiting for repair',
            'max-h-[52vh] w-full rounded-2xl object-cover',
            html`<div class="grid max-w-md grid-cols-4 grid-rows-2 gap-3" aria-hidden="true">
              ${devices.map(
                ([icon, cls]) => html`<div class="${cls} flex items-center justify-center rounded-2xl bg-white/80 p-5 text-brand-600 shadow-sm"><i class="fa-solid ${icon}"></i></div>`
              )}
            </div>`
          )}
        </div>
      </div>`);
  }

  // ---- Flash messages (survive one redirect) ---------------------------------------------
  RH.flash = function (message, type = 'success') {
    try {
      sessionStorage.setItem('rh_flash', JSON.stringify({ message, type }));
    } catch (e) {
      /* ignore */
    }
  };

  function showFlash() {
    try {
      const f = JSON.parse(sessionStorage.getItem('rh_flash'));
      sessionStorage.removeItem('rh_flash');
      if (f) RH.ui.toast(f.message, f.type);
    } catch (e) {
      /* ignore */
    }
  }

  RH.layout = { app, authHero, showFlash };
})();
