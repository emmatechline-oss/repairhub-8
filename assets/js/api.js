/**
 * Thin client for the RepairHub API.
 * Every backend response looks like { success, message, data, meta? } or { success:false, message, errors }.
 * Calls resolve to { data, meta, message } and reject with RH.ApiError.
 */
(function () {
  class ApiError extends Error {
    constructor(message, status, errors) {
      super(message);
      this.name = 'ApiError';
      this.status = status; // 0 = network / timeout
      this.errors = errors || []; // [{ field, message }] for validation failures
    }
  }
  RH.ApiError = ApiError;

  async function request(method, path, opts = {}) {
    const { body, query, form, auth = true } = opts;

    const url = new URL(RH.config.API_BASE_URL + path);
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
      });
    }

    const headers = { Accept: 'application/json' };
    const token = RH.auth && RH.auth.getToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    let payload;
    if (form) {
      payload = form; // FormData: the browser sets the multipart boundary itself
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RH.config.REQUEST_TIMEOUT_MS);

    let res;
    try {
      res = await fetch(url, { method, headers, body: payload, signal: controller.signal });
    } catch (err) {
      throw new ApiError(
        err.name === 'AbortError'
          ? 'The server took too long to respond. Please try again.'
          : `Can't reach the RepairHub server (${new URL(RH.config.API_BASE_URL).host}). Check that it is running and allows this site (CLIENT_URL), then try again.`,
        0
      );
    } finally {
      clearTimeout(timer);
    }

    let json = null;
    try {
      json = await res.json();
    } catch (e) {
      /* empty or non-JSON body */
    }

    if (!res.ok || (json && json.success === false)) {
      const message = (json && json.message) || `Request failed (${res.status})`;
      // An expired/invalid session: drop it and send the user to log in again. Other 401s
      // (e.g. "Current password is incorrect") are ordinary errors for the page to show.
      if (res.status === 401 && auth && token && /not authorized/i.test(message)) {
        RH.auth.clear();
        RH.go('auth/login.html', { next: location.pathname + location.search, expired: 1 });
      }
      throw new ApiError(message, res.status, json && json.errors);
    }

    return { data: json ? json.data : null, meta: (json && json.meta) || null, message: json && json.message };
  }

  const get = (path, query, opts) => request('GET', path, { ...opts, query });
  const post = (path, body, opts) => request('POST', path, { ...opts, body });
  const patch = (path, body, opts) => request('PATCH', path, { ...opts, body });

  RH.api = {
    request,

    users: {
      register: (body) => post('/users/register', body, { auth: false }),
      login: (body) => post('/users/login', body, { auth: false }),
      me: () => get('/users/me'),
      update: (id, body) => patch(`/users/${id}`, body),
      changePassword: (body) => post('/users/change-password', body),
    },

    customerProfile: {
      me: () => get('/customer-profiles/me'),
      update: (id, body) => patch(`/customer-profiles/${id}`, body),
    },

    technicians: {
      get: (id) => get(`/technician-profiles/${id}`, null, { auth: false }),
      me: () => get('/technician-profiles/me'),
      update: (id, body) => patch(`/technician-profiles/${id}`, body),
      uploadDocs: (id, formData) => request('POST', `/technician-profiles/${id}/verification-docs`, { form: formData }),
    },

    serviceCenters: {
      me: () => get('/service-centers/me'),
      update: (id, body) => patch(`/service-centers/${id}`, body),
      uploadDocs: (id, formData) => request('POST', `/service-centers/${id}/verification-docs`, { form: formData }),
      team: (id) => get(`/service-centers/${id}/team`),
      addMember: (id, email) => post(`/service-centers/${id}/team`, { email }),
      removeMember: (id, technicianId) => request('DELETE', `/service-centers/${id}/team/${technicianId}`),
    },

    disputes: {
      open: (formData) => request('POST', '/disputes', { form: formData }),
      list: (query) => get('/disputes', query),
    },

    categories: {
      list: () => get('/service-categories', null, { auth: false }),
    },

    repairRequests: {
      create: (formData) => request('POST', '/repair-requests', { form: formData }),
      list: (query) => get('/repair-requests', query),
      get: (id) => get(`/repair-requests/${id}`),
      cancel: (id) => patch(`/repair-requests/${id}/cancel`),
    },

    quotations: {
      forRequest: (requestId, sort) => get(`/quotations/repair-request/${requestId}`, { sort }),
      accept: (id) => patch(`/quotations/${id}/accept`),
      submit: (body) => post('/quotations', body),
      mine: () => get('/quotations/mine'),
      withdraw: (id) => patch(`/quotations/${id}/withdraw`),
    },

    appointments: {
      create: (body) => post('/appointments', body),
      get: (id) => get(`/appointments/${id}`),
      reschedule: (id, scheduledAt) => patch(`/appointments/${id}/reschedule`, { scheduledAt }),
      cancel: (id, reason) => patch(`/appointments/${id}/cancel`, reason ? { reason } : {}),
    },

    jobs: {
      list: (query) => get('/repair-jobs', query),
      get: (id) => get(`/repair-jobs/${id}`),
      confirm: (id) => post(`/repair-jobs/${id}/confirm`),
      updateStatus: (id, status, note) => patch(`/repair-jobs/${id}/status`, { status, ...(note ? { note } : {}) }),
    },

    payments: {
      pay: (repairJobId, method) => post('/transactions/pay', { repairJobId, method }),
      topup: (amount) => post('/transactions/topup', { amount }),
      verify: (reference) => get(`/transactions/verify/${encodeURIComponent(reference)}`),
    },

    wallet: {
      me: () => get('/wallets/me'),
      withdraw: (body) => post('/wallets/withdraw', body),
      transactions: (query) => get('/transactions/me', query),
    },

    reviews: {
      create: (body) => post('/reviews', body),
      forTechnician: (technicianId, query) => get(`/reviews/technician/${technicianId}`, query, { auth: false }),
    },

    warranties: {
      resolveClaim: (id, claimId, status, resolutionNote) => patch(`/warranty-records/${id}/claims/${claimId}`, { status, ...(resolutionNote ? { resolutionNote } : {}) }),
      byJob: (jobId) => get(`/warranty-records/job/${jobId}`),
      get: (id) => get(`/warranty-records/${id}`),
      claim: (id, description) => post(`/warranty-records/${id}/claims`, { description }),
    },

    // ---- admin only ------------------------------------------------------------------
    admin: {
      stats: () => get('/admin/stats'),
      withdrawals: (query) => get('/admin/withdrawals', query),
      processWithdrawal: (id, decision, note) => patch(`/admin/withdrawals/${id}`, { decision, ...(note ? { note } : {}) }),
      runAutoRelease: () => post('/admin/run-auto-release'),
      users: (query) => get('/users', query),
      user: (id) => get(`/users/${id}`),
      setUserStatus: (id, status) => patch(`/users/${id}/status`, { status }),
      pendingTechnicians: (query) => get('/technician-profiles/pending', query),
      verifyTechnician: (id, decision, feedback) => patch(`/technician-profiles/${id}/verify`, { decision, ...(feedback ? { feedback } : {}) }),
      pendingCenters: (query) => get('/service-centers/pending', query),
      verifyCenter: (id, decision, feedback) => patch(`/service-centers/${id}/verify`, { decision, ...(feedback ? { feedback } : {}) }),
      disputes: (query) => get('/disputes', query),
      dispute: (id) => get(`/disputes/${id}`),
      resolveDispute: (id, body) => patch(`/disputes/${id}/resolve`, body),
      createCategory: (body) => post('/service-categories', body),
      updateCategory: (id, body) => patch(`/service-categories/${id}`, body),
    },

    notifications: {
      list: (query) => get('/notifications', query),
      markRead: (id) => patch(`/notifications/${id}/read`),
      markAllRead: () => patch('/notifications/read-all'),
    },
  };
})();
