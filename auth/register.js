(function () {
  const ROLES = {
    customer: 'Join as a customer to find trusted technicians and get your devices repaired easily.',
    technician: 'Join as a technician to receive repair requests, send quotes and grow your business.',
    service_center: 'Register your repair shop to receive repair requests and send quotes on behalf of your team.',
  };
  const role = ROLES[RH.param('role')] ? RH.param('role') : 'customer';
  document.getElementById('role-subtitle').textContent = ROLES[role];
  const isShop = role === 'service_center';
  document.getElementById('business-field').hidden = !isShop;
  if (isShop) document.querySelector('label[for="fullName"]').textContent = 'Your full name (account owner)';

  const form = document.getElementById('register-form');
  const NG_PHONE = /^(\+234|234|0)[789][01]\d{8}$/; // same rule as the API

  /** Accept "803 123 4567", "08031234567" or "+2348031234567" and send +234XXXXXXXXXX. */
  function normalisePhone(raw) {
    let p = raw.replace(/[\s-]/g, '');
    if (!p) return '';
    if (p.startsWith('+234')) return p;
    if (p.startsWith('234')) return `+${p}`;
    if (p.startsWith('0')) p = p.slice(1);
    return `+234${p}`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    RH.ui.clearErrors(form);

    const v = Object.fromEntries(new FormData(form));
    const phone = normalisePhone(v.phone || '');
    let ok = true;
    const fail = (field, msg) => {
      RH.ui.fieldError(form, field, msg);
      ok = false;
    };

    if (v.fullName.trim().length < 2) fail('fullName', 'Enter your full name.');
    if (isShop && !v.businessName.trim()) fail('businessName', 'Enter your business name.');
    if (!phone) fail('phone', 'Enter your phone number.');
    else if (!NG_PHONE.test(phone)) fail('phone', 'Enter a valid Nigerian mobile number, e.g. 803 123 4567.');
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) fail('email', 'Enter a valid email address.');
    if (v.password.length < 8) fail('password', 'Password must be at least 8 characters.');
    else if (v.password !== v.confirmPassword) fail('confirmPassword', 'Passwords do not match.');
    if (!v.terms) {
      ok = false;
      RH.ui.toast('Please accept the Terms of Service and Privacy Policy.', 'error');
    }
    if (!ok) return;

    const button = form.querySelector('[type="submit"]');
    await RH.ui.withLoading(button, async () => {
      try {
        const { data } = await RH.api.users.register({
          fullName: v.fullName.trim(),
          email: v.email.trim(),
          phone,
          password: v.password,
          role,
          ...(isShop ? { businessName: v.businessName.trim() } : {}),
        });
        RH.flash(`Welcome to RepairHub, ${data.user.fullName.split(' ')[0]}!`);
        RH.finishLogin(data);
      } catch (err) {
        RH.ui.showFormError(form, err);
      }
    }, 'Creating account…');
  });
})();
