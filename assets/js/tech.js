/**
 * Helpers shared by the technician pages.
 */
(function () {
  let profilePromise = null;

  RH.tech = {
    isCenter: () => (RH.auth.getUser() || {}).role === 'service_center',

    /** The logged-in provider's own profile: technician profile, or the repair shop's profile. */
    profile(refresh) {
      if (refresh || !profilePromise) {
        profilePromise = (this.isCenter() ? RH.api.serviceCenters.me() : RH.api.technicians.me()).then((r) => r.data);
      }
      return profilePromise;
    },

    /** Where distance is measured from: a technician's base location or the shop's location. */
    base(p) {
      return this.point(p && (p.baseLocation || p.location));
    },

    profileUrl() {
      return RH.url(this.isCenter() ? 'center/profile.html' : 'technician/profile.html');
    },

    isVerified: (p) => p && p.verificationStatus === 'verified',

    /** { lng, lat } from a GeoJSON point, or null when it is unset ([0, 0]). */
    point(geo) {
      const c = geo && geo.coordinates;
      return c && (c[0] || c[1]) ? { lng: c[0], lat: c[1] } : null;
    },

    /** Straight-line distance in km between two { lng, lat } points. */
    distanceKm(a, b) {
      if (!a || !b) return null;
      const rad = (d) => (d * Math.PI) / 180;
      const dLat = rad(b.lat - a.lat);
      const dLng = rad(b.lng - a.lng);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
      return 6371 * 2 * Math.asin(Math.sqrt(h));
    },

    formatKm: (km) => (km === null || km === undefined ? '' : km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`),

    /** Browser location as { lng, lat }. Rejects with a readable message. */
    currentLocation() {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Location is not available in this browser.'));
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
          () => reject(new Error('Location permission was denied or timed out.')),
          { timeout: 10000 }
        );
      });
    },

    // Allowed job moves; mirrors TRANSITIONS in the API's repairJobController.
    TRANSITIONS: {
      accepted: ['diagnosing', 'in_progress', 'on_hold'],
      diagnosing: ['awaiting_parts', 'in_progress', 'on_hold'],
      awaiting_parts: ['in_progress', 'on_hold'],
      in_progress: ['quality_check', 'awaiting_parts', 'on_hold', 'ready', 'completed'],
      quality_check: ['in_progress', 'ready', 'completed'],
      ready: ['completed'],
      on_hold: ['diagnosing', 'in_progress'],
    },
    // These statuses need the customer to have paid (escrow) or chosen pay-on-delivery first.
    NEEDS_PAYMENT: ['in_progress', 'quality_check', 'ready', 'completed'],
  };
})();
