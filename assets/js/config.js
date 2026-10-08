/**
 * RepairHub frontend configuration.
 * Load this first on every page: it creates the global `RH` namespace the other scripts extend.
 */
window.RH = window.RH || {};

(function () {
  // Folder that contains /assets, /auth and /customer, worked out from this script's own URL so
  // links keep working whether the site is served from "/", a sub-folder (GitHub Pages) or file://.
  const ROOT_URL = new URL('../../', document.currentScript.src);

  // Default backend: the local API when the site itself runs locally (Live Server etc.),
  // otherwise the deployed one. Override without editing code:
  //   ?api=https://repairhub-api-1.onrender.com/api   (remembered in localStorage)
  //   localStorage.removeItem('rh_api_base') to go back to the default.
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const DEFAULT_API = isLocal ? 'http://localhost:5001/api' : 'https://repairhub-api-1.onrender.com/api';
  const fromQuery = new URLSearchParams(location.search).get('api');
  let apiBase = DEFAULT_API;
  try {
    if (fromQuery) localStorage.setItem('rh_api_base', fromQuery);
    apiBase = localStorage.getItem('rh_api_base') || DEFAULT_API;
  } catch (e) {
    apiBase = fromQuery || DEFAULT_API;
  }

  RH.config = {
    API_BASE_URL: apiBase.replace(/\/+$/, ''),
    REQUEST_TIMEOUT_MS: 60000, // Render free instances can take ~50s to wake up
    LOGO_URL: 'https://res.cloudinary.com/kz6ru1lw/image/upload/v1790942424/New_Logo_mxexp4.png',
  };

  /**
   * Design image slots. Drop a file at the path shown and it replaces the icon placeholder
   * automatically (the icon stays when the file is missing). See assets/img/README.md for sizes.
   */
  RH.images = {
    authHero: 'assets/img/auth-hero.jpg', // left panel of role / login / sign-up (devices photo)
    roleCustomer: 'assets/img/role-customer.png', // "I need a repair" card illustration
    roleTechnician: 'assets/img/role-technician.png', // "I'm a technician" card illustration
    requestSuccess: 'assets/img/success-confetti.png', // check-mark burst on "request submitted" and "booking confirmed"
    // Device pictures used on repair cards, summaries and the category grid.
    devices: {
      laptop: 'assets/img/devices/laptop.png',
      phone: 'assets/img/devices/phone.png',
      television: 'assets/img/devices/television.png',
      generator: 'assets/img/devices/generator.png',
      'air-conditioner': 'assets/img/devices/air-conditioner.png',
      refrigerator: 'assets/img/devices/refrigerator.png',
      'washing-machine': 'assets/img/devices/washing-machine.png',
      'gaming-console': 'assets/img/devices/gaming-console.png',
      printer: 'assets/img/devices/printer.png',
    },
  };

  /** Build an absolute URL to a page in this site: RH.url('customer/my-repairs.html', { tab: 'active' }) */
  RH.url = function (path, params) {
    const url = new URL(path, ROOT_URL);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
      });
    }
    return url.href;
  };

  RH.go = function (path, params) {
    location.href = RH.url(path, params);
  };

  /** Read a query-string parameter from the current page. */
  RH.param = function (name) {
    return new URLSearchParams(location.search).get(name);
  };
})();
