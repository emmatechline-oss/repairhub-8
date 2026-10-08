# Design images

Put the exported design images here with exactly these names. Each one replaces an icon placeholder
automatically; until the file exists the icon is shown, so the app never shows a broken image.
The paths are defined in `RH.images` in [`../js/config.js`](../js/config.js). Change them there if you
use another name or format.

| File | Where it appears | Suggested size |
| --- | --- | --- |
| `auth-hero.jpg` | Left panel of Choose role, Log in and Create account (the laptop / phone / tablet photo) | 1200 × 1000, JPG |
| `role-customer.png` | "I need a repair" card on Choose role (woman with phone illustration) | 320 × 320, transparent PNG |
| `role-technician.png` | "I'm a technician" card on Choose role (technician illustration) | 320 × 320, transparent PNG |
| `success-confetti.png` | Check mark with confetti on "Repair request has been submitted" and "Booking confirmed" (after payment) | 320 × 240, transparent PNG |
| `devices/laptop.png` | Device picture on repair cards, summaries and the Home category grid | 240 × 240, transparent PNG |
| `devices/phone.png` | 〃 | 〃 |
| `devices/television.png` | 〃 | 〃 |
| `devices/generator.png` | 〃 | 〃 |
| `devices/air-conditioner.png` | 〃 | 〃 |
| `devices/refrigerator.png` | 〃 | 〃 |
| `devices/washing-machine.png` | 〃 | 〃 |
| `devices/gaming-console.png` | 〃 | 〃 |
| `devices/printer.png` | 〃 | 〃 |

Device pictures are picked from the repair's device / category name (for example "Laptop" or
"Laptops" → `laptop.png`); anything unmatched keeps its icon.

The logo is loaded from Cloudinary (`RH.config.LOGO_URL`).

## Design images the backend can't support

- **Profile photos** (customer avatar in the top bar, technician photos): the API stores no profile
  pictures, so initials are shown instead.
- **"Before / after" repair photos**: the API only keeps the photos the customer uploaded with the
  request; those are shown on Repair details as "Your photos & videos".
- **Warranty claim evidence**: claims accept a text description only.
