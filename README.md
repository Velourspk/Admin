# Velours.pk

Storefront + private admin dashboard (invoicing and inventory) for Velours.pk. Pure static site: HTML, CSS and JavaScript, no build step.

- **Storefront:** `/` — hero, live collection (pulled from inventory), story, contact.
- **Admin:** `/#/admin/dashboard` — sales KPIs, 7-day chart, restock alerts, inventory CRUD with quick stock adjust, invoice generator (auto numbering, stock deduction, print / save as PDF), CSV export, JSON backup and restore.

## Configure
Edit the `CFG` block at the top of `app.js` (WhatsApp number, email, Instagram, address).

## Publish with GitHub Pages
Repo → Settings → Pages → Deploy from branch → `main` / root.

## Important notes
- Data is stored in the browser's `localStorage`. Each device/browser has its own data, so use **Data → Download backup** regularly.
- There is no server-side login. Anyone who knows the `/#/admin` address can open the admin on their own browser (they only see their own local data, not yours), but do not treat this as secure storage for sensitive customer data. For multi-device sync and real authentication, connect a backend (e.g. Firebase or Supabase).
