/**
 * Data helpers for customer pages: cached lookups and the rules that turn raw API records into
 * what the screens show (titles, next actions, warranty state).
 */
(function () {
  const techCache = new Map();

  RH.data = {
    /** Public technician profile (name, rating, experience). Cached; resolves null if unavailable. */
    technician(id) {
      if (!id) return Promise.resolve(null);
      const key = String(id._id || id);
      if (!techCache.has(key)) {
        techCache.set(
          key,
          RH.api.technicians
            .get(key)
            .then((r) => r.data)
            .catch(() => null)
        );
      }
      return techCache.get(key);
    },

    techName(profile) {
      return (profile && profile.userId && profile.userId.fullName) || 'Your technician';
    },

    /** Active categories split into top-level groups with their sub-categories. */
    async categoryTree() {
      const { data } = await RH.api.categories.list();
      const parents = data.filter((c) => !c.parentCategory);
      return parents.map((p) => ({
        ...p,
        children: data.filter((c) => c.parentCategory === p.name),
      }));
    },

    /** "Laptops · Screen & keyboard" for a request whose category is populated. */
    requestTitle(request) {
      const cat = request.serviceCategoryId;
      const catName = cat && cat.name;
      return request.itemType ? `${request.itemType} repair` : catName || 'Repair request';
    },

    warranty(job) {
      if (!job || job.status !== 'completed' || !job.completedAt || !job.warrantyDays) return null;
      const expiresAt = new Date(new Date(job.completedAt).getTime() + job.warrantyDays * 86400000);
      return { expiresAt, active: expiresAt > new Date() };
    },

    /** Turn a 24h hour into the backend-friendly ISO date for a given day. */
    toISO(day, hour) {
      const d = new Date(day);
      d.setHours(hour, 0, 0, 0);
      return d.toISOString();
    },

    SERVICE_MODES: {
      onsite: { label: 'Home service', hint: 'Technician comes to your location', icon: 'fa-house' },
      dropoff: { label: 'Visit shop', hint: "Take your device to the technician's shop", icon: 'fa-store' },
      pickup: { label: 'Pickup', hint: 'Technician picks up your device and returns it', icon: 'fa-truck-fast' },
    },

    PAYMENT_METHODS: {
      paystack: 'Card / bank (Paystack)',
      wallet: 'RepairHub wallet',
      cash: 'Pay on delivery',
    },
  };
})();
