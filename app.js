/* Velours.pk — storefront + admin (invoicing & inventory). Data lives in this browser's localStorage. */
(() => {
'use strict';

/* ---------- CONFIG: edit these ---------- */
const CFG = {
  brand: 'Velours.pk',
  address: 'Lahore, Pakistan',
  website: 'https://velours.pk',
  whatsapp: '923269121444',
  email: 'velourspk@gmail.com',
  instagram: 'https://www.instagram.com/velourspk/',
  tiktok: 'https://www.tiktok.com/@velourspk',
  facebook: 'https://www.facebook.com/people/Velours/61573967205135/',
  youtube: 'https://www.youtube.com/VeloursPk',
  lowStockDefault: 5
};
const KEY = 'velours.v2';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => 'Rs ' + Math.round(Number(n) || 0).toLocaleString('en-PK');
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const niceDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const grad = s => `linear-gradient(135deg,hsl(${hue(s)} 38% 24%),hsl(${(hue(s) + 40) % 360} 45% 12%))`;

/* ---------- data ---------- */
function seed() {
  // Real Velours.pk catalogue (names, prices, images from velours.pk). Stock and cost are placeholders: edit them in Inventory.
  const I = f => 'https://velours.pk/cdn/shop/files/' + f + '&width=720';
  const P = (sku, name, category, price, img) => ({ id: uid(), sku, name, category, price, cost: 0, qty: 20, reorder: 5, img });
  const products = [
    P('VLR-001', 'Anti-Aging Brightening Cream — 30g', 'Creams', 1595, I('5.png?v=1768298004')),
    P('VLR-002', 'Brightening Cream & Serum Bundle', 'Bundles', 3750, I('SM_Posts_-_VPK_845cc2df-e60b-4e4b-9c5f-8bee36f3f9b2.png?v=1761809611')),
    P('VLR-003', 'Cleanser Milk Facewash — 100ml', 'Cleansers', 895, I('2_d67e9ef7-cd85-4afa-abc5-6c4f51be9422.png?v=1761808304')),
    P('VLR-004', 'Facewash/Sunscreen + Serum Bundle', 'Bundles', 3000, I('27.png?v=1761808325')),
    P('VLR-005', 'Glycolic Acid Serum — 30ml', 'Serums', 2850, I('7_780e4f59-0d16-430e-9bd2-efb115196d62.jpg?v=1768297729')),
    P('VLR-006', 'Hyaluronic Acid Serum — 30ml', 'Serums', 2950, I('9_4e6622fb-1a63-4b50-8940-2a4ab8793ba1.jpg?v=1768297826')),
    P('VLR-007', 'Melasma Treatment Bundle — 3 in 1', 'Bundles', 5250, I('2_75cfa09f-368c-46ca-9824-9eade6daa246.jpg?v=1760174807')),
    P('VLR-008', 'Niacinamide Serum — 30ml', 'Serums', 2850, I('6.jpg?v=1768297857')),
    P('VLR-009', 'Retinol Serum — 30ml', 'Serums', 2950, I('10_3026d6ce-8c61-4f56-910e-a13432082d81.jpg?v=1768297889')),
    P('VLR-010', 'Serum Set: 2 Premium Serums + Gift', 'Bundles', 5000, I('29.png?v=1761808057')),
    P('VLR-011', 'Skin Support Set — Niacinamide + Hyaluronic Acid', 'Bundles', 4200, I('producthighresolution4.jpg?v=1768298052')),
    P('VLR-012', 'Sunscreen SPF60 — 30g', 'Sun Protection', 895, I('4_fe39ec9d-535e-4a49-9cff-ecf238fdb6b4.png?v=1768297978')),
    P('VLR-013', 'Vitamin C + CG Serum — 30ml', 'Serums', 2850, I('8_0eee067d-0c46-448f-89de-9c37abd020da.jpg?v=1765205818'))
  ];
  return { products, invoices: [], counter: 0 };
}
function load() {
  try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && Array.isArray(r.products) && Array.isArray(r.invoices)) return r; } catch (e) {}
  const s = seed(); persist(s); return s;
}
function persist(d = db) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
let db = load();
const save = () => persist(db);
const prod = id => db.products.find(p => p.id === id);
const low = p => p.qty <= (p.reorder ?? CFG.lowStockDefault);
const status = p => p.qty <= 0 ? ['Out of stock', 'bad'] : low(p) ? ['Low stock', 'warn'] : ['In stock', 'ok'];

/* ---------- UI primitives ---------- */
function toast(msg, err) {
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3200);
}
function openModal(html, onReady) {
  $('#modal').innerHTML = html; $('#modalBg').hidden = false;
  $('#modalBg').onclick = e => { if (e.target.id === 'modalBg') closeModal(); };
  onReady && onReady($('#modal'));
}
function closeModal() { $('#modalBg').hidden = true; $('#modal').innerHTML = ''; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
function download(name, text, type = 'text/plain') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500);
}
const csvCell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
const toCSV = rows => rows.map(r => r.map(csvCell).join(',')).join('\n');

/* ---------- router ---------- */
const views = { dashboard: viewDashboard, inventory: viewInventory, invoices: viewInvoices, settings: viewSettings };
const titles = { dashboard: 'Dashboard', inventory: 'Inventory', invoices: 'Invoices', settings: 'Data & Backup' };
let invQuery = '', prodQuery = '', shopCat = 'All';
function route() {
  const h = location.hash;
  const isAdmin = h.startsWith('#/admin');
  document.body.classList.toggle('is-admin', isAdmin);
  $('#site').hidden = isAdmin; $('#admin').hidden = !isAdmin;
  $('#glow').style.display = 'block';
  if (isAdmin) {
    const name = h.split('/')[2] || 'dashboard';
    const v = views[name] ? name : 'dashboard';
    $$('#side nav a').forEach(a => a.classList.toggle('on', a.dataset.nav === v));
    $('#viewTitle').textContent = titles[v];
    $('#side').classList.remove('open');
    $('#topActions').innerHTML = '';
    views[v]();
    window.scrollTo(0, 0);
    document.title = titles[v] + ' — Velours Admin';
  } else {
    document.title = 'Velours.pk — Soft luxury, made in Pakistan';
    renderShop(); window.scrollTo(0, 0); observe();
  }
}
window.addEventListener('hashchange', route);

/* ---------- STOREFRONT ---------- */
function renderShop() {
  const items = db.products.filter(p => p.qty > 0);
  const cats = ['All', ...new Set(items.map(p => p.category).filter(Boolean))];
  if (!cats.includes(shopCat)) shopCat = 'All';
  $('#chips').innerHTML = cats.map(c => `<button class="chip ${c === shopCat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  const shown = items.filter(p => shopCat === 'All' || p.category === shopCat);
  $('#shop').innerHTML = shown.length ? shown.map(p => {
    const thumb = p.img ? `style="background-image:url('${esc(p.img)}')"` : `style="background:${grad(p.name)}"`;
    const order = CFG.whatsapp ? `<a class="btn btn-ghost sm" target="_blank" rel="noopener" href="https://wa.me/${esc(CFG.whatsapp)}?text=${encodeURIComponent('Hi Velours, I would like to order: ' + p.name + ' (' + p.sku + ')')}">Order</a>` : '';
    return `<article class="card reveal"><div class="thumb" ${thumb}>${p.img ? '' : `<span class="mono">${esc(p.name[0])}</span>`}</div>
      <div class="info"><div class="cat">${esc(p.category)}</div><h3>${esc(p.name)}</h3>
      <div class="row"><span class="price">${fmt(p.price)}</span>${low(p) ? '<span class="tag low">Few left</span>' : order}</div></div></article>`;
  }).join('') : `<div class="empty">New pieces arriving soon.</div>`;
  const ext = (u, t, c = 'btn btn-ghost') => `<a class="${c}" target="_blank" rel="noopener" href="${esc(u)}">${t}</a>`;
  const links = [];
  if (CFG.whatsapp) links.push(ext('https://wa.me/' + CFG.whatsapp, 'Order on WhatsApp', 'btn btn-gold'));
  if (CFG.instagram) links.push(ext(CFG.instagram, 'Instagram'));
  if (CFG.tiktok) links.push(ext(CFG.tiktok, 'TikTok'));
  if (CFG.facebook) links.push(ext(CFG.facebook, 'Facebook'));
  if (CFG.youtube) links.push(ext(CFG.youtube, 'YouTube'));
  if (CFG.email) links.push(`<a class="btn btn-ghost" href="mailto:${esc(CFG.email)}">Email</a>`);
  $('#contactLinks').innerHTML = links.join('');
  $('#socials').innerHTML = [['Instagram', CFG.instagram], ['TikTok', CFG.tiktok], ['Facebook', CFG.facebook], ['YouTube', CFG.youtube], ['velours.pk', CFG.website]].filter(x => x[1]).map(([t, u]) => `<a target="_blank" rel="noopener" href="${esc(u)}">${t}</a>`).join('');
  $('#yr').textContent = new Date().getFullYear();
  renderStats();
}
function renderStats() {
  const all = db.products, ser = all.filter(p => p.category === 'Serums').length, bun = all.filter(p => p.category === 'Bundles').length;
  const min = all.length ? Math.min(...all.map(p => p.price)) : 0;
  const pad = n => String(n).padStart(2, '0');
  $('#hSku').textContent = pad(all.length); $('#hSer').textContent = pad(ser); $('#hBun').textContent = pad(bun); $('#hMin').textContent = fmt(min);
  [['#sP', all.length], ['#sS', ser], ['#sB', bun]].forEach(([id, n]) => { const el = $(id); el.dataset.count = n; el.textContent = n; });
}
let io;
function observe() {
  io && io.disconnect();
  io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); if (e.target.querySelector('[data-count]') && !e.target.dataset.counted) { e.target.dataset.counted = 1; countUp(e.target); } }
  }), { threshold: .12 });
  $$('#site .reveal').forEach(el => io.observe(el));
  const st = $('.stats'); if (st) io.observe(st.parentElement);
}
function countUp(root) {
  $$('[data-count]', root).forEach(el => {
    const to = +el.dataset.count; let n = 0; const step = Math.max(1, Math.round(to / 40));
    const t = setInterval(() => { n = Math.min(to, n + step); el.textContent = n; if (n >= to) clearInterval(t); }, 30);
  });
}
document.addEventListener('click', e => {
  const chip = e.target.closest('.chip'); if (chip) { shopCat = chip.dataset.cat; renderShop(); observe(); return; }
  const sc = e.target.closest('[data-scroll]');
  if (sc) { e.preventDefault(); const t = $(sc.getAttribute('href')); t && t.scrollIntoView({ behavior: 'smooth' }); }
});
window.addEventListener('scroll', () => $('#nav').classList.toggle('scrolled', scrollY > 30), { passive: true });
window.addEventListener('pointermove', e => { const g = $('#glow'); g.style.left = e.clientX + 'px'; g.style.top = e.clientY + 'px'; });
document.addEventListener('pointermove', e => {
  const c = e.target.closest && e.target.closest('.card'); if (!c) return;
  const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  c.style.transform = `perspective(700px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-4px)`;
});
document.addEventListener('pointerout', e => { const c = e.target.closest && e.target.closest('.card'); if (c && !c.contains(e.relatedTarget)) c.style.transform = ''; });
$('#menuBtn').addEventListener('click', () => $('#side').classList.toggle('open'));
$('#side').addEventListener('click', e => { if (e.target.closest('a')) $('#side').classList.remove('open'); });

/* ---------- ADMIN: dashboard ---------- */
function viewDashboard() {
  const inv = db.invoices;
  const sales = inv.reduce((s, i) => s + i.total, 0);
  const paid = inv.filter(i => i.status === 'Paid').reduce((s, i) => s + i.total, 0);
  const pending = sales - paid;
  const units = db.products.reduce((s, p) => s + p.qty, 0);
  const stockVal = db.products.reduce((s, p) => s + p.qty * p.cost, 0);
  const lows = db.products.filter(low);
  // last 7 days
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0, 10); });
  const vals = days.map(d => inv.filter(i => i.date === d).reduce((s, i) => s + i.total, 0));
  const max = Math.max(...vals, 1);
  const bars = vals.map((v, i) => {
    const h = Math.round((v / max) * 130), x = 20 + i * 62;
    return `<g><title>${niceDate(days[i])}: ${fmt(v)}</title><rect class="b" x="${x}" y="${150 - h}" width="40" height="${Math.max(h, 2)}" rx="6"/>
      <text x="${x + 20}" y="170" text-anchor="middle">${new Date(days[i] + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' })}</text></g>`;
  }).join('');
  const sold = {};
  inv.forEach(i => i.items.forEach(it => { sold[it.name] = (sold[it.name] || 0) + it.qty; }));
  const top = Object.entries(sold).sort((a, b) => b[1] - a[1]).slice(0, 5);
  $('#topActions').innerHTML = `<button class="btn btn-gold sm" data-act="new-invoice">+ New invoice</button>`;
  $('#view').innerHTML = `
  <div class="kpis">
    <div class="kpi"><label>Total sales</label><b>${fmt(sales)}</b><small>${inv.length} invoices</small></div>
    <div class="kpi ok"><label>Collected</label><b>${fmt(paid)}</b><small>Paid invoices</small></div>
    <div class="kpi warn"><label>Pending</label><b>${fmt(pending)}</b><small>Awaiting payment</small></div>
    <div class="kpi"><label>Stock on hand</label><b>${units}</b><small>Worth ${fmt(stockVal)} at cost</small></div>
    <div class="kpi ${lows.length ? 'warn' : 'ok'}"><label>Needs restock</label><b>${lows.length}</b><small>Low or out of stock</small></div>
  </div>
  <div class="cols">
    <div class="panel"><h3>Sales — last 7 days</h3>
      <svg class="bar-chart" viewBox="0 0 450 180" role="img" aria-label="Sales last 7 days"><line x1="10" x2="440" y1="150" y2="150"/>${bars}</svg></div>
    <div class="panel"><h3>Top sellers</h3><div class="list">${top.length ? top.map(([n, q]) => `<div class="li"><span>${esc(n)}</span><b>${q} sold</b></div>`).join('') : '<span class="muted">No sales yet.</span>'}</div></div>
  </div>
  <div class="cols" style="margin-top:1rem">
    <div class="panel"><h3>Recent invoices</h3><div class="list">${inv.slice(-5).reverse().map(i => `<div class="li"><span>${esc(i.no)} · ${esc(i.customer.name)}</span><span>${fmt(i.total)} <span class="badge ${i.status === 'Paid' ? 'ok' : 'warn'}">${i.status}</span></span></div>`).join('') || '<span class="muted">Nothing yet.</span>'}</div></div>
    <div class="panel"><h3>Restock alerts</h3><div class="list">${lows.length ? lows.map(p => `<div class="li"><span>${esc(p.name)}</span><span class="badge ${status(p)[1]}">${p.qty} left</span></div>`).join('') : '<span class="muted">All stock levels healthy.</span>'}</div></div>
  </div>`;
}

/* ---------- ADMIN: inventory ---------- */
function viewInventory() {
  $('#topActions').innerHTML = `<button class="btn btn-ghost sm" data-act="export-inv">Export CSV</button><button class="btn btn-gold sm" data-act="add-product">+ Add product</button>`;
  $('#view').innerHTML = `<div class="toolbar"><input class="search" id="pq" placeholder="Search name, SKU or category…" value="${esc(prodQuery)}"></div><div class="tbl-wrap" id="ptable"></div>`;
  $('#pq').oninput = e => { prodQuery = e.target.value; drawProducts(); };
  drawProducts();
}
function drawProducts() {
  const q = prodQuery.toLowerCase();
  const rows = db.products.filter(p => [p.name, p.sku, p.category].join(' ').toLowerCase().includes(q));
  $('#ptable').innerHTML = `<table><thead><tr><th>Product</th><th>Category</th><th class="num">Price</th><th class="num">Cost</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(p => {
    const [st, cl] = status(p);
    return `<tr><td><div class="pname"><div class="dot" style="background:${p.img ? `url('${esc(p.img)}') center/cover` : grad(p.name)}">${p.img ? '' : esc(p.name[0])}</div><div>${esc(p.name)}<small>${esc(p.sku)}</small></div></div></td>
    <td>${esc(p.category)}</td><td class="num">${fmt(p.price)}</td><td class="num">${fmt(p.cost)}</td>
    <td><span class="qty"><button data-act="adj" data-id="${p.id}" data-d="-1" aria-label="Decrease">−</button><b>${p.qty}</b><button data-act="adj" data-id="${p.id}" data-d="1" aria-label="Increase">+</button></span></td>
    <td><span class="badge ${cl}">${st}</span></td>
    <td><div class="acts"><button class="btn btn-ghost sm" data-act="edit-product" data-id="${p.id}">Edit</button><button class="btn btn-ghost sm danger" data-act="del-product" data-id="${p.id}">Delete</button></div></td></tr>`;
  }).join('') || `<tr><td colspan="7" class="muted" style="text-align:center;padding:2rem">No products found.</td></tr>`}</tbody></table>`;
}
function productForm(p) {
  const x = p || { sku: 'VLR-' + String(db.products.length + 1).padStart(3, '0'), name: '', category: '', price: '', cost: '', qty: 0, reorder: CFG.lowStockDefault, img: '' };
  openModal(`<h2>${p ? 'Edit product' : 'Add product'}</h2>
  <form class="form" id="pform">
    <div class="field"><label>Name</label><input name="name" required value="${esc(x.name)}"></div>
    <div class="field"><label>SKU</label><input name="sku" required value="${esc(x.sku)}"></div>
    <div class="field"><label>Category</label><input name="category" list="cats" value="${esc(x.category)}"><datalist id="cats">${[...new Set(db.products.map(p => p.category))].map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
    <div class="field"><label>Image URL (optional)</label><input name="img" type="url" placeholder="https://…" value="${esc(x.img)}"></div>
    <div class="field"><label>Selling price (Rs)</label><input name="price" type="number" min="0" step="1" required value="${esc(x.price)}"></div>
    <div class="field"><label>Cost price (Rs)</label><input name="cost" type="number" min="0" step="1" required value="${esc(x.cost)}"></div>
    <div class="field"><label>Quantity in stock</label><input name="qty" type="number" min="0" step="1" required value="${esc(x.qty)}"></div>
    <div class="field"><label>Low-stock alert at</label><input name="reorder" type="number" min="0" step="1" required value="${esc(x.reorder)}"></div>
    <div class="modal-foot full" style="grid-column:1/-1"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-gold">${p ? 'Save changes' : 'Add product'}</button></div>
  </form>`, m => {
    $('#pform', m).onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const rec = { name: f.name.trim(), sku: f.sku.trim(), category: f.category.trim() || 'General', img: f.img.trim(), price: +f.price, cost: +f.cost, qty: Math.max(0, Math.floor(+f.qty)), reorder: Math.max(0, Math.floor(+f.reorder)) };
      if (db.products.some(o => o.sku === rec.sku && o.id !== (p && p.id))) return toast('That SKU already exists', true);
      if (p) Object.assign(p, rec); else db.products.push({ id: uid(), ...rec });
      save(); closeModal(); toast(p ? 'Product updated' : 'Product added'); route();
    };
  });
}

/* ---------- ADMIN: invoices ---------- */
function viewInvoices() {
  $('#topActions').innerHTML = `<button class="btn btn-ghost sm" data-act="export-inv-list">Export CSV</button><button class="btn btn-gold sm" data-act="new-invoice">+ New invoice</button>`;
  $('#view').innerHTML = `<div class="toolbar"><input class="search" id="iq" placeholder="Search invoice no, customer, city…" value="${esc(invQuery)}"></div><div class="tbl-wrap" id="itable"></div>`;
  $('#iq').oninput = e => { invQuery = e.target.value; drawInvoices(); };
  drawInvoices();
}
function drawInvoices() {
  const q = invQuery.toLowerCase();
  const rows = [...db.invoices].reverse().filter(i => [i.no, i.customer.name, i.customer.city, i.method].join(' ').toLowerCase().includes(q));
  $('#itable').innerHTML = `<table><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Payment</th><th class="num">Total</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(i => `
  <tr><td><b>${esc(i.no)}</b></td><td>${niceDate(i.date)}</td><td>${esc(i.customer.name)}<small style="display:block;color:var(--muted)">${esc(i.customer.city)}</small></td><td>${esc(i.method)}</td><td class="num">${fmt(i.total)}</td>
  <td><span class="badge ${i.status === 'Paid' ? 'ok' : 'warn'}">${i.status}</span></td>
  <td><div class="acts"><button class="btn btn-ghost sm" data-act="view-invoice" data-id="${i.id}">View</button><button class="btn btn-ghost sm" data-act="toggle-paid" data-id="${i.id}">${i.status === 'Paid' ? 'Mark pending' : 'Mark paid'}</button><button class="btn btn-ghost sm danger" data-act="del-invoice" data-id="${i.id}">Delete</button></div></td></tr>`).join('') || `<tr><td colspan="7" class="muted" style="text-align:center;padding:2rem">No invoices yet.</td></tr>`}</tbody></table>`;
}
function invoiceForm() {
  const avail = db.products.filter(p => p.qty > 0);
  if (!avail.length) return toast('Add products with stock before invoicing', true);
  const opts = avail.map(p => `<option value="${p.id}">${esc(p.name)} — ${fmt(p.price)} (${p.qty} left)</option>`).join('');
  const row = () => `<div class="item-row"><select class="it-p">${opts}</select><input class="it-q" type="number" min="1" value="1"><span class="amt">Rs 0</span><button type="button" class="icon-btn" data-act="rm-row" aria-label="Remove">×</button></div>`;
  openModal(`<h2>New invoice</h2>
  <form id="iform">
    <div class="form">
      <div class="field"><label>Customer name</label><input name="name" required></div>
      <div class="field"><label>Phone</label><input name="phone" type="tel" placeholder="03xx xxxxxxx"></div>
      <div class="field"><label>City</label><input name="city"></div>
      <div class="field"><label>Payment method</label><select name="method"><option>COD</option><option>Bank Transfer</option><option>JazzCash</option><option>Easypaisa</option><option>Card</option></select></div>
      <div class="field full"><label>Delivery address</label><textarea name="address" rows="2"></textarea></div>
    </div>
    <div class="items-head" style="margin-top:1.2rem"><span>Item</span><span>Qty</span><span style="text-align:right">Amount</span><span></span></div>
    <div id="rows">${row()}</div>
    <button type="button" class="btn btn-ghost sm" data-act="add-row">+ Add item</button>
    <div class="form" style="margin-top:1rem">
      <div class="field"><label>Discount (Rs)</label><input name="discount" type="number" min="0" value="0"></div>
      <div class="field"><label>Shipping (Rs)</label><input name="shipping" type="number" min="0" value="250"></div>
      <div class="field"><label>Status</label><select name="status"><option>Pending</option><option>Paid</option></select></div>
    </div>
    <div class="totals"><div><span>Subtotal</span><span id="t-sub">Rs 0</span></div><div><span>Discount</span><span id="t-dis">− Rs 0</span></div><div><span>Shipping</span><span id="t-ship">Rs 0</span></div><div class="grand"><span>Total</span><span id="t-tot">Rs 0</span></div></div>
    <p class="warn-txt" id="warn"></p>
    <div class="modal-foot"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-gold">Generate invoice</button></div>
  </form>`, m => {
    const form = $('#iform', m);
    const read = () => {
      const lines = $$('.item-row', m).map(r => ({ p: prod($('.it-p', r).value), q: Math.max(1, Math.floor(+$('.it-q', r).value || 1)), r }));
      const agg = {}; lines.forEach(l => { agg[l.p.id] = (agg[l.p.id] || 0) + l.q; });
      const over = lines.find(l => agg[l.p.id] > l.p.qty);
      return { lines, over };
    };
    const calc = () => {
      const { lines, over } = read();
      let sub = 0;
      lines.forEach(l => { const a = l.p.price * l.q; sub += a; $('.amt', l.r).textContent = fmt(a); });
      const dis = Math.min(+form.elements.discount.value || 0, sub), ship = +form.elements.shipping.value || 0;
      $('#t-sub', m).textContent = fmt(sub); $('#t-dis', m).textContent = '− ' + fmt(dis); $('#t-ship', m).textContent = fmt(ship); $('#t-tot', m).textContent = fmt(sub - dis + ship);
      $('#warn', m).textContent = over ? `Only ${over.p.qty} of "${over.p.name}" in stock.` : '';
      return { sub, dis, ship, lines, over };
    };
    form.addEventListener('input', calc);
    m.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'add-row') { $('#rows', m).insertAdjacentHTML('beforeend', row()); calc(); }
      if (a.dataset.act === 'rm-row' && $$('.item-row', m).length > 1) { a.closest('.item-row').remove(); calc(); }
    });
    form.onsubmit = e => {
      e.preventDefault();
      const { sub, dis, ship, lines, over } = calc();
      if (over) return toast('Not enough stock for one of the items', true);
      const merged = {};
      lines.forEach(l => { merged[l.p.id] = merged[l.p.id] || { pid: l.p.id, name: l.p.name, sku: l.p.sku, price: l.p.price, qty: 0 }; merged[l.p.id].qty += l.q; });
      const items = Object.values(merged);
      items.forEach(it => { prod(it.pid).qty -= it.qty; });
      db.counter += 1;
      const f = Object.fromEntries(new FormData(form));
      const inv = { id: uid(), no: 'VLR-' + String(db.counter).padStart(4, '0'), date: today(), customer: { name: f.name.trim(), phone: f.phone.trim(), city: f.city.trim(), address: f.address.trim() }, items, discount: dis, shipping: ship, method: f.method, status: f.status, subtotal: sub, total: sub - dis + ship };
      db.invoices.push(inv); save(); toast('Invoice ' + inv.no + ' created · stock updated'); showInvoice(inv.id); route();
    };
    calc();
  });
}
function invoiceHTML(i) {
  return `<div class="inv">
    <div class="head"><div><div class="brand">Velours<span>.pk</span></div><div style="font-size:.82rem;color:#666">${esc(CFG.address)}<br>velours.pk${CFG.email ? '<br>' + esc(CFG.email) : ''}${CFG.whatsapp ? '<br>WhatsApp +' + esc(CFG.whatsapp) : ''}</div></div>
    <div class="meta"><h2>INVOICE</h2><b>${esc(i.no)}</b><br>${niceDate(i.date)}<br><span class="stamp ${i.status === 'Paid' ? 'paid' : 'pending'}">${i.status.toUpperCase()}</span></div></div>
    <div class="bill"><b>Billed to</b>${esc(i.customer.name)}<br>${i.customer.phone ? esc(i.customer.phone) + '<br>' : ''}${esc(i.customer.address)}${i.customer.address && i.customer.city ? ', ' : ''}${esc(i.customer.city)}<br><span style="color:#777">Payment: ${esc(i.method)}</span></div>
    <table><thead><tr><th>Item</th><th class="num">Price</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody>
    ${i.items.map(it => `<tr><td>${esc(it.name)}<br><small style="color:#888">${esc(it.sku)}</small></td><td class="num">${fmt(it.price)}</td><td class="num">${it.qty}</td><td class="num">${fmt(it.price * it.qty)}</td></tr>`).join('')}</tbody></table>
    <div class="totals"><div><span>Subtotal</span><span>${fmt(i.subtotal)}</span></div>${i.discount ? `<div><span>Discount</span><span>− ${fmt(i.discount)}</span></div>` : ''}<div><span>Shipping</span><span>${fmt(i.shipping)}</span></div><div class="grand"><span>Total</span><span>${fmt(i.total)}</span></div></div>
    <p class="note">Thank you for shopping with Velours.pk.</p></div>`;
}
function showInvoice(id) {
  const i = db.invoices.find(x => x.id === id); if (!i) return;
  openModal(invoiceHTML(i) + `<div class="modal-foot"><button class="btn btn-ghost" data-act="close">Close</button><button class="btn btn-gold" data-act="print" data-id="${i.id}">Print / Save as PDF</button></div>`);
}

/* ---------- ADMIN: data ---------- */
function viewSettings() {
  $('#view').innerHTML = `<div class="cols" style="grid-template-columns:1fr 1fr">
    <div class="panel"><h3>Backup</h3><p class="muted" style="margin-bottom:1rem">Your data is stored in this browser only. Download a backup regularly, and restore it on another device.</p>
      <div class="hero-cta"><button class="btn btn-gold sm" data-act="backup">Download backup</button><label class="btn btn-ghost sm" style="cursor:pointer">Restore backup<input type="file" accept="application/json" id="restore" hidden></label></div></div>
    <div class="panel"><h3>Reset</h3><p class="muted" style="margin-bottom:1rem">Start fresh with an empty catalogue (clears sample products and invoices), or reload the sample data.</p>
      <div class="hero-cta"><button class="btn btn-ghost sm danger" data-act="clear">Clear everything</button><button class="btn btn-ghost sm" data-act="sample">Load sample data</button></div></div></div>`;
  $('#restore').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { const d = JSON.parse(r.result); if (!Array.isArray(d.products) || !Array.isArray(d.invoices)) throw 0; d.counter = d.counter || d.invoices.length; db = d; save(); toast('Backup restored'); } catch (x) { toast('That file is not a valid backup', true); } };
    r.readAsText(f);
  };
}

/* ---------- actions ---------- */
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  const id = a.dataset.id, act = a.dataset.act;
  switch (act) {
    case 'close': closeModal(); break;
    case 'new-invoice': invoiceForm(); break;
    case 'add-product': productForm(); break;
    case 'edit-product': productForm(prod(id)); break;
    case 'del-product': if (confirm('Delete this product? Past invoices keep their records.')) { db.products = db.products.filter(p => p.id !== id); save(); toast('Product deleted'); route(); } break;
    case 'adj': { const p = prod(id); p.qty = Math.max(0, p.qty + +a.dataset.d); save(); drawProducts(); break; }
    case 'view-invoice': showInvoice(id); break;
    case 'print': { const i = db.invoices.find(x => x.id === id); $('#printArea').innerHTML = invoiceHTML(i); document.title = i.no + ' — Velours.pk'; window.print(); break; }
    case 'toggle-paid': { const i = db.invoices.find(x => x.id === id); i.status = i.status === 'Paid' ? 'Pending' : 'Paid'; save(); drawInvoices(); toast(i.no + ' marked ' + i.status.toLowerCase()); break; }
    case 'del-invoice': { const i = db.invoices.find(x => x.id === id); if (confirm('Delete ' + i.no + '? Its items will be returned to stock.')) { i.items.forEach(it => { const p = prod(it.pid); if (p) p.qty += it.qty; }); db.invoices = db.invoices.filter(x => x.id !== id); save(); toast('Invoice deleted · stock restored'); drawInvoices(); } break; }
    case 'export-inv': download('velours-inventory.csv', toCSV([['SKU', 'Name', 'Category', 'Price', 'Cost', 'Qty', 'Reorder at'], ...db.products.map(p => [p.sku, p.name, p.category, p.price, p.cost, p.qty, p.reorder])]), 'text/csv'); break;
    case 'export-inv-list': download('velours-invoices.csv', toCSV([['Invoice', 'Date', 'Customer', 'Phone', 'City', 'Payment', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Status'], ...db.invoices.map(i => [i.no, i.date, i.customer.name, i.customer.phone, i.customer.city, i.method, i.subtotal, i.discount, i.shipping, i.total, i.status])]), 'text/csv'); break;
    case 'backup': download('velours-backup-' + today() + '.json', JSON.stringify(db, null, 2), 'application/json'); break;
    case 'clear': if (confirm('Clear ALL products and invoices from this browser?')) { db = { products: [], invoices: [], counter: 0 }; save(); toast('All data cleared'); } break;
    case 'sample': if (confirm('Replace current data with sample data?')) { db = seed(); save(); toast('Sample data loaded'); } break;
  }
});
window.addEventListener('afterprint', () => { $('#printArea').innerHTML = ''; });

function initNet() {
  const cv = $('#net'), cx = cv.getContext('2d');
  if (!cx || matchMedia('(prefers-reduced-motion: reduce)').matches) { cv.style.display = 'none'; return; }
  let w = 0, h = 0, nodes = [];
  const mouse = { x: -999, y: -999 };
  const build = () => {
    w = cv.width = innerWidth; h = cv.height = innerHeight;
    nodes = Array.from({ length: Math.min(70, Math.floor(w * h / 22000)) }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35 }));
  };
  addEventListener('resize', build);
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  const step = () => {
    cx.clearRect(0, 0, w, h);
    for (const n of nodes) { n.x += n.vx; n.y += n.vy; if (n.x < 0 || n.x > w) n.vx *= -1; if (n.y < 0 || n.y > h) n.vy *= -1; }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      cx.fillStyle = 'rgba(77,226,255,.7)'; cx.fillRect(a.x - 1, a.y - 1, 2, 2);
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 130) { cx.strokeStyle = `rgba(77,226,255,${.16 * (1 - d / 130)})`; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke(); }
      }
      const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      if (dm < 170) { cx.strokeStyle = `rgba(201,169,110,${.35 * (1 - dm / 170)})`; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(mouse.x, mouse.y); cx.stroke(); }
    }
    requestAnimationFrame(step);
  };
  build(); step();
}
setInterval(() => { const c = $('#clock'); if (c) c.textContent = new Date().toLocaleTimeString('en-GB'); }, 1000);
initNet();
route();
})();
