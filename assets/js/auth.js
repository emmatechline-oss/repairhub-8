/**
 * Session handling: the JWT from /users/login|register plus the user object, kept in localStorage.
 * The token key stays "authToken" so older pages in this repo keep working.
 */
(function () {
  const TOKEN_KEY = 'authToken';
  const USER_KEY = 'rh_user';

  // Roles this frontend has screens for, and where each lands after logging in.
  const HOME = {
    customer: 'customer/home.html',
    technician: 'technician/home.html',
    service_center: 'technician/home.html',
    admin: 'admin/dashboard.html',
  };

  const read = (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  };
  const write = (key, value) => {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) {
      /* storage blocked: the session just won't survive a reload */
    }
  };

  function tokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.exp ? payload.exp * 1000 < Date.now() : false;
    } catch (e) {
      return true;
    }
  }

  RH.auth = {
    getToken() {
      const token = read(TOKEN_KEY);
      if (token && tokenExpired(token)) {
        this.clear();
        return null;
      }
      return token;
    },

    getUser() {
      try {
        return JSON.parse(read(USER_KEY));
      } catch (e) {
        return null;
      }
    },

    setSession(token, user) {
      write(TOKEN_KEY, token);
      this.setUser(user);
    },

    setUser(user) {
      write(USER_KEY, JSON.stringify(user));
    },

    clear() {
      write(TOKEN_KEY, null);
      write(USER_KEY, null);
    },

    logout() {
      this.clear();
      RH.go('auth/login.html');
    },

    isSupportedRole(role) {
      return Object.prototype.hasOwnProperty.call(HOME, role);
    },

    homeFor(role) {
      return HOME[role] || 'auth/login.html';
    },

    /**
     * Gate a page. Sends logged-out users to login (coming back afterwards) and users with the
     * wrong role to their own home. Returns the user, or null when a redirect is under way.
     */
    require(roles) {
      const user = this.getUser();
      if (!this.getToken() || !user) {
        RH.go('auth/login.html', { next: location.pathname + location.search });
        return null;
      }
      if (roles && !roles.includes(user.role)) {
        RH.go(this.homeFor(user.role));
        return null;
      }
      return user;
    },

    /** Only follow ?next= when it points back into this site (no open redirects). */
    safeNext(next) {
      if (!next) return null;
      try {
        const url = new URL(next, location.href);
        return url.origin === location.origin ? url.href : null;
      } catch (e) {
        return null;
      }
    },
  };
})();
