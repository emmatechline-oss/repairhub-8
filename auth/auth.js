/** Behaviour shared by the login and sign-up pages. */
(function () {
  // Already logged in? Skip straight to the app.
  const existing = RH.auth.getToken() && RH.auth.getUser();
  if (existing && RH.auth.isSupportedRole(existing.role)) {
    RH.go(RH.auth.homeFor(existing.role));
    return;
  }

  RH.layout.authHero();

  // Show / hide password buttons
  document.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.toggle);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.querySelector('i').className = show ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });

  /** Save the session and leave for ?next= or the role's home page. */
  RH.finishLogin = function ({ token, user }) {
    if (!RH.auth.isSupportedRole(user.role)) {
      const err = new RH.ApiError(
        'Service-center accounts are not supported in this web app yet.',
        403
      );
      throw err;
    }
    RH.auth.setSession(token, user);
    const next = RH.auth.safeNext(RH.param('next'));
    location.href = next || RH.url(RH.auth.homeFor(user.role));
  };
})();
