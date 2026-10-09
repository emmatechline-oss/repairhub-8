# repairhubcohort9

RepairHub web frontend: plain HTML, JavaScript and Tailwind (Play CDN), talking to the
[RepairHub API](https://github.com/Code4Frankie/RepairHub_api).

## Running it

Serve the folder with any static server, for example the VS Code **Live Server** extension (right-click
`index.html` → Open with Live Server). The root `index.html` sends logged-in users to their home page and
everyone else to `auth/role.html`. Don't open the files directly from disk (`file://`).

The app calls the live API at `https://repairhub-api-1.onrender.com/api`, wherever it runs.
The first request after a quiet period can take up to a minute while the free Render instance wakes up.

The API only accepts browsers from the addresses in its `CLIENT_URL` setting (on Render: the service's
**Environment** tab). For Live Server that must include `http://localhost:5500,http://127.0.0.1:5500`, plus
the hosted frontend's URL once it is deployed. Otherwise every request is blocked by the browser (CORS).

To use a local backend instead, open any page once with `?api=http://localhost:5001/api` (remembered in
localStorage). Run `localStorage.removeItem('rh_api_base')` in the browser console to go back to the live API.

## Structure

```text
assets/
  css/app.css              base styles
  js/config.js             API base URL, RH.url() link helper (load first)
  js/tailwind-config.js    Tailwind theme + shared classes (.btn-primary, .card, .input, ...)
  js/ui.js                 safe html`` templating, formatting, toasts, modals, form errors
  js/auth.js               session (JWT in localStorage "authToken"), role guards
  js/api.js                one function per backend endpoint
  js/layout.js             sidebar + top bar + notifications for customer pages
  js/data.js               shared lookups (technician profiles, categories, warranty state)
  js/tech.js               technician / repair-shop helpers (own profile, distance, job status rules)
  js/disputes.js           "Report a problem" dialog and dispute status panel
  js/motion-fx.js          page animations with Motion (motion.dev, vanilla Framer Motion), loaded from jsDelivr
auth/        role.html, register.html, login.html
customer/    home, request-repair, request-submitted, quotations, book, payment,
             payment-callback, booking-confirmed, my-repairs, repair-details,
             review, warranty, wallet, settings
technician/  home (status + documents + reviews), requests, quotes, jobs, wallet, profile
             (also used by repair shops)
center/      repair-shop profile and team
admin/       dashboard, verifications, disputes, withdrawals, users, categories
assets/img/  design image slots; see assets/img/README.md for file names and sizes
legacy/      the earlier quotations prototype (static data), kept for reference
```

Animations: [assets/js/motion-fx.js](assets/js/motion-fx.js) watches the page and animates content as it
appears (cards rise in, dialogs spring open, headline numbers count up, success pages celebrate). Nothing
needs to be added per page; it is switched off for people who turn on "reduce motion" on their device.

Every customer page has a `<main id="page-content" hidden>`; `RH.layout.app({ active })` checks the
login, builds the shell around it and shows it. Always render API data with `RH.ui.html` so it is escaped.

## Customer flow → API

| Screen | Endpoints |
| --- | --- |
| Create account / Log in | `POST /users/register`, `POST /users/login` |
| Home, Request a repair | `GET /service-categories`, `GET /customer-profiles/me`, `POST /repair-requests` (multipart, field `media`) |
| Request submitted | `GET /repair-requests/:id` |
| Quotations | `GET /quotations/repair-request/:id?sort=`, `PATCH /quotations/:id/accept`, `GET /technician-profiles/:id`, `GET /reviews/technician/:id` |
| Book technician | `POST /appointments` (returns `repairJobId`) |
| Payment | `POST /transactions/pay` (`paystack` / `wallet` / `cash`), `GET /wallets/me`, `GET /transactions/verify/:reference` |
| My Repairs | `GET /repair-requests`, `GET /repair-jobs` |
| Track repair / Repair completed | `GET /repair-jobs/:id`, `GET /appointments/:id`, `POST /repair-jobs/:id/confirm`, `PATCH /appointments/:id/reschedule`, `PATCH /appointments/:id/cancel` |
| Rate & review | `POST /reviews` |
| Warranty details / claim | `GET /warranty-records/job/:jobId`, `GET /warranty-records/:id`, `POST /warranty-records/:id/claims` |
| Notifications (top bar) | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Wallet | `GET /wallets/me`, `POST /transactions/topup` (Paystack), `GET /transactions/me` |
| Report a problem (repair details) | `POST /disputes` (multipart, field `evidence`), `GET /disputes` |
| Settings | `PATCH /users/:id`, `POST /users/change-password`, `PATCH /customer-profiles/:id` |

Design elements with no backend support were left out: forgot/reset password, phone verification,
Google/Apple sign-in, messages and support chat, the fixed ₦2,000 home-service fee, half-star ratings,
and evidence uploads / extra fields on warranty claims. The appointment date and time are chosen when
booking a technician, because repair requests don't store them.

## Technician pages

No technician designs exist; these follow the customer pages' style.

| Page | What it does | Endpoints |
| --- | --- | --- |
| Overview | Verification status, upload verification documents, your reviews | `GET /technician-profiles/me`, `POST /technician-profiles/:id/verification-docs`, `GET /reviews/technician/:id` |
| Job requests | Open requests in your categories, optionally near your current or base location; send a quote | `GET /repair-requests?lng=&lat=&radiusKm=&serviceCategoryId=`, `POST /quotations` |
| My quotes | Track and withdraw quotes | `GET /quotations/mine`, `PATCH /quotations/:id/withdraw` |
| My jobs | Customer contact, appointment, move the job through its stages; reschedule / cancel; resolve warranty claims; report a problem | `GET /repair-jobs`, `GET /repair-jobs/:id`, `PATCH /repair-jobs/:id/status`, `PATCH /appointments/:id/reschedule\|cancel`, `GET /warranty-records/job/:jobId`, `PATCH /warranty-records/:id/claims/:claimId`, `POST /disputes` |
| Wallet | Earnings, commission owed, withdrawal requests, transactions | `GET /wallets/me`, `POST /wallets/withdraw`, `GET /transactions/me` |
| Profile | Categories, service areas, base location, availability | `PATCH /technician-profiles/:id` |

How technicians get requests:

- A technician must be **verified** (documents uploaded, approved by an admin) to see requests or quote.
- Requests are matched by **category**: only requests in the technician's categories are shown (all
  categories if none are chosen). Matching is exact, so ticking a category on the Profile page also ticks its
  issue types.
- **Distance** is an optional filter. It only finds requests that have map coordinates, which the customer's
  request form now asks for automatically (or takes from their saved address). Requests without a location
  appear under "Anywhere" only.
- New-request **notifications** are sent only to verified, available technicians whose saved categories
  include the request's category.

## Repair shops (service centers)

A repair shop signs up from "Register your shop" on the role page (it asks for the business name) and uses the
technician pages (overview, job requests, quotes, jobs, wallet), plus:

| Page | What it does | Endpoints |
| --- | --- | --- |
| Overview | Same as technicians; documents go to the shop's profile | `GET /service-centers/me`, `POST /service-centers/:id/verification-docs` |
| Shop profile | Business name, description, address, coverage radius, categories, shop location | `PATCH /service-centers/:id` |
| Team | Add technicians by email, remove them | `GET/POST /service-centers/:id/team`, `DELETE /service-centers/:id/team/:technicianId` |

When a shop sends a quote it picks the team member who will do the work (the API requires `technicianId`),
so a shop needs at least one technician on its team before quoting. Jobs show the assigned technician, and
payment for the shop's jobs goes to the shop's wallet.

## Admin pages

There are no admin designs; these pages follow the same visual style and cover every admin endpoint:

| Page | What it does | Endpoints |
| --- | --- | --- |
| Dashboard | Totals, items needing attention, manual escrow auto-release | `GET /admin/stats`, `POST /admin/run-auto-release` |
| Verifications | View documents, approve / reject technicians and service centers | `GET /technician-profiles/pending`, `PATCH /technician-profiles/:id/verify`, `GET /service-centers/pending`, `PATCH /service-centers/:id/verify` |
| Disputes | Read the reason and evidence, then release, refund or partially refund | `GET /disputes`, `PATCH /disputes/:id/resolve` |
| Withdrawals | Mark payout requests paid (after the bank transfer) or reject them | `GET /admin/withdrawals`, `PATCH /admin/withdrawals/:id` |
| Users | Search, filter, suspend and reactivate accounts | `GET /users`, `PATCH /users/:id/status` |
| Categories | Add, rename and deactivate repair categories | `GET/POST /service-categories`, `PATCH /service-categories/:id` |

Admins log in on the normal login page and land on `admin/dashboard.html`. Admin accounts can't sign up:
create one with `npm run seed:admin` in the API repo (uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from its `.env`).
Warranty claims have no admin list endpoint, so they are resolved by the technician, not here.

## Backend setup the frontend relies on

- **Service categories must exist.** Without them no repair request can be created. Run
  `npm run seed:categories` in the API repo, or add them on the admin Categories page.
- **CORS:** add the frontend's origin to the API's `CLIENT_URL` (comma-separated), or leave it unset to allow all.
  For local development with Live Server that means
  `CLIENT_URL=http://localhost:5500,http://127.0.0.1:5500`. Otherwise every request is blocked by the browser.
- **Paystack:** set the API's `PAYSTACK_CALLBACK_URL` to `<frontend-url>/customer/payment-callback.html`.
- **Technicians** must be verified by an admin before they can send quotations.
