/**
 * Shared Tailwind (Play CDN) theme + component classes. Load right after cdn.tailwindcss.com.
 */
window.tailwind = window.tailwind || {}; // keeps the page working (unstyled) if the CDN fails to load
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff5ff',
          100: '#dbe8fe',
          200: '#bfd5fe',
          500: '#3b6ff6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        ink: '#0f1b3d',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
};

(function () {
  const style = document.createElement('style');
  style.type = 'text/tailwindcss';
  style.textContent = `
    @layer components {
      .btn { @apply inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60; }
      .btn-primary { @apply btn bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700; }
      .btn-outline { @apply btn border border-brand-600 bg-white text-brand-600 hover:bg-brand-50; }
      .btn-ghost { @apply btn text-slate-600 hover:bg-slate-100; }
      .btn-danger { @apply btn border border-red-200 bg-white text-red-600 hover:bg-red-50; }
      .btn-sm { @apply px-3.5 py-2 text-xs; }
      .card { @apply rounded-2xl border border-slate-200 bg-white; }
      .card-soft { @apply rounded-2xl border border-brand-100 bg-brand-50; }
      .label { @apply mb-1.5 block text-sm font-semibold text-ink; }
      .input { @apply w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20; }
      .input-invalid { @apply border-red-400 focus:border-red-500 focus:ring-red-500/20; }
      .field-error { @apply mt-1 text-xs text-red-600; }
      .chip { @apply inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 transition hover:border-brand-200; }
      .chip-active { @apply border-brand-600 bg-brand-50 text-brand-700; }
      .badge { @apply inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium; }
      .nav-link { @apply flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-white; }
      .nav-link-active { @apply bg-brand-600 text-white shadow-md shadow-brand-600/25 hover:bg-brand-600; }
      .muted { @apply text-slate-500; }
    }
  `;
  document.head.appendChild(style);
})();
