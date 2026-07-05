// =============================================
// admin.js — Admin Dashboard Logic
// MUHAMEDDISPO
// TODO(security): MFA not yet implemented — enable via Supabase Auth settings
// =============================================

// Service role key used ONLY in admin for write operations
// Removed SERVICE_KEY and duplicate getSupabase definition.

// =============================================
// Auth guard + init
// =============================================
function showLogin() {
  const loginView = document.getElementById('login-view');
  const dashView = document.getElementById('dashboard-view');
  if(loginView) loginView.style.display = 'block';
  if(dashView) dashView.style.display = 'none';
}

function showDashboard() {
  const loginView = document.getElementById('login-view');
  const dashView = document.getElementById('dashboard-view');
  if(loginView) loginView.style.display = 'none';
  if(dashView) dashView.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', async () => {
  let currentSession = null;
  const sb = getSupabase();

  try {
    const { data: { session }, error } = await sb.auth.getSession();
    if (error || !session) {
      showLogin();
    } else {
      currentSession = session;
      showDashboard();
    }
  } catch (err) {
    showLogin();
  }

  if (currentSession) {
    const emailEl = document.getElementById('admin-user-email');
    if (emailEl) emailEl.textContent = currentSession.user.email;
    await loadGroupsTab();
    await populateGroupFilter();
  }
  
  initForms();

  // Login Form handler
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const btn = document.getElementById('login-btn');
      const errorEl = document.getElementById('login-error');

      btn.textContent = 'Signing in…';
      btn.disabled = true;
      errorEl.style.display = 'none';

      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
          errorEl.textContent = 'Invalid credentials.';
          errorEl.style.display = 'block';
          return;
        }
        
        // Success
        const emailEl = document.getElementById('admin-user-email');
        if (emailEl) emailEl.textContent = data.session.user.email;
        showDashboard();
        await loadGroupsTab();
        await populateGroupFilter();
      } catch (err) {
        errorEl.textContent = 'An error occurred.';
        errorEl.style.display = 'block';
      } finally {
        btn.textContent = 'Sign In';
        btn.disabled = false;
      }
    });
  }

  // Logout handler
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await sb.auth.signOut();
      showLogin();
      document.getElementById('email').value = '';
      document.getElementById('password').value = '';
    });
  }
});

// =============================================
// Tab switching
// =============================================
function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));

  const titleEl = document.getElementById('admin-page-title');
  const addBtn = document.getElementById('main-add-btn');

  if (tab === 'groups') {
    document.getElementById('tab-groups').classList.add('active');
    document.getElementById('tab-groups-btn').classList.add('active');
    if (titleEl) titleEl.textContent = 'Product Groups';
    if (addBtn) {
      addBtn.style.display = 'block';
      addBtn.textContent = '+ New Group'; 
      addBtn.onclick = () => openGroupModal(); 
    }
    loadGroupsTab();
  } else if (tab === 'wholesale') {
    document.getElementById('tab-wholesale').classList.add('active');
    document.getElementById('tab-wholesale-btn').classList.add('active');
    if (titleEl) titleEl.textContent = 'Wholesale Products';
    if (addBtn) { 
      addBtn.style.display = 'block';
      addBtn.textContent = '+ New Wholesale Product'; 
      addBtn.onclick = () => openProductModal(null, null, 'wholesale_magic_flag'); 
    }
    loadWholesaleProducts();
  } else if (tab === 'orders') {
    document.getElementById('tab-orders').classList.add('active');
    document.getElementById('tab-orders-btn').classList.add('active');
    if (titleEl) titleEl.textContent = 'Customer Orders';
    if (addBtn) { addBtn.style.display = 'none'; }
    loadOrdersTab();
  } else {
    document.getElementById('tab-products').classList.add('active');
    document.getElementById('tab-products-btn').classList.add('active');
    if (titleEl) titleEl.textContent = 'All Products';
    if (addBtn) { addBtn.style.display = 'none'; }
    loadAllProducts();
  }
}

// =============================================
// ORDERS TAB
// =============================================
async function loadOrdersTab() {
  const tbody = document.getElementById('orders-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">Loading orders…</td></tr>';

  try {
    const sb = getSupabase();
    const { data: orders, error } = await sb
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!orders || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">No orders yet.</td></tr>';
      return;
    }

    tbody.replaceChildren();
    for (const order of orders) {
      const row = buildOrderRow(order);
      tbody.appendChild(row);
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#e55;">Could not load orders. Make sure the orders table exists in Supabase.</td></tr>';
    console.error('Orders load error:', err);
  }
}

function buildOrderRow(order) {
  const tr = document.createElement('tr');
  const shortId = (order.id || '').toString().substring(0, 8).toUpperCase();
  const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const status = order.status || 'pending';

  const itemCount = Array.isArray(order.cart_items) ? order.cart_items.reduce((s, i) => s + (i.qty || 1), 0) : '?';

  const statusBadge = `<span class="order-status-badge ${status}">${status}</span>`;

  tr.innerHTML = `
    <td style="font-family:monospace;font-size:12px;color:var(--gold);">#${shortId}</td>
    <td>${order.customer_name || '—'}</td>
    <td style="font-size:12px;color:var(--text-muted);">${order.customer_email || '—'}</td>
    <td>${order.payment_method || '—'}</td>
    <td style="color:var(--gold);font-weight:700;">$${parseFloat(order.subtotal || 0).toFixed(2)}</td>
    <td>${statusBadge}</td>
    <td style="font-size:12px;color:var(--text-muted);">${date}</td>
    <td>
      <select class="order-status-select" data-order-id="${order.id}" onchange="updateOrderStatus(this)">
        <option value="pending" ${status==='pending'?'selected':''}>Pending</option>
        <option value="confirmed" ${status==='confirmed'?'selected':''}>Confirmed</option>
        <option value="shipped" ${status==='shipped'?'selected':''}>Shipped</option>
        <option value="cancelled" ${status==='cancelled'?'selected':''}>Cancelled</option>
      </select>
    </td>
  `;
  return tr;
}

async function updateOrderStatus(selectEl) {
  const orderId = selectEl.getAttribute('data-order-id');
  const newStatus = selectEl.value;
  try {
    const sb = getSupabase();
    const { error } = await sb.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) throw error;
    showToast('Order status updated!', 'success');
    loadOrdersTab();
  } catch (err) {
    showToast('Failed to update status', 'error');
    console.error(err);
  }
}

// =============================================
// GROUPS TAB
// =============================================
async function loadGroupsTab() {
  const list = document.getElementById('groups-list');
  if (!list) return;
  list.replaceChildren();

  try {
    const sb = getSupabase();
    const { data: groups, error } = await sb
      .from('product_groups').select('*').order('sort_order');
    if (error) throw error;

    if (!groups.length) {
      const msg = document.createElement('p');
      msg.textContent = 'No product groups yet. Create your first group!';
      msg.style.cssText = 'color:var(--text-muted);padding:40px 0;';
      list.appendChild(msg);
      return;
    }

    for (const group of groups) {
      const card = await buildGroupAdminCard(group);
      list.appendChild(card);
    }
  } catch {
    showToast('Failed to load groups', 'error');
  }
}

async function buildGroupAdminCard(group) {
  const card = document.createElement('div');
  card.className = 'admin-card';
  card.id = 'group-card-' + group.id;

  // Header
  const header = document.createElement('div');
  header.className = 'admin-card-header';

  const left = document.createElement('div');
  left.style.cssText = 'display:flex;align-items:center;gap:16px;';
  if (group.hero_image_url) {
    const img = document.createElement('img');
    img.src = group.hero_image_url;
    img.alt = group.name;
    img.className = 'product-thumb';
    left.appendChild(img);
  }
  const nameEl = document.createElement('div');
  const n = document.createElement('div');
  n.className = 'admin-card-name';
  n.textContent = safeText(group.name);
  const tag = document.createElement('div');
  tag.style.cssText = 'font-size:12px;color:var(--gold);margin-top:2px;';
  tag.textContent = group.tagline || '';
  nameEl.appendChild(n);
  nameEl.appendChild(tag);
  left.appendChild(nameEl);
  header.appendChild(left);

  const actions = document.createElement('div');
  actions.className = 'admin-card-actions';

  const addSgBtn = buildIconBtn('+ Subgroup', false, () => openSubgroupModal(null, group.id));
  addSgBtn.style.cssText = 'padding:0 12px;font-size:11px;font-family:var(--font-head);font-weight:700;letter-spacing:1px;text-transform:uppercase;height:32px;border-radius:6px;border:1px solid var(--border-gold);color:var(--gold);background:none;cursor:pointer;transition:var(--transition);';
  addSgBtn.onmouseover = () => addSgBtn.style.background = 'rgba(197,179,111,0.08)';
  addSgBtn.onmouseout = () => addSgBtn.style.background = 'none';

  const editBtn = buildIconBtn('✎', false, () => openGroupModal(group));
  const delBtn = buildIconBtn('✕', true, () => confirmDelete('group', group.id, group.name));

  actions.appendChild(addSgBtn);
  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  header.appendChild(actions);
  card.appendChild(header);

  // Load subgroups
  const sgArea = document.createElement('div');
  sgArea.style.marginTop = '16px';

  try {
    const sb = getSupabase();
    const { data: subgroups } = await sb
      .from('product_subgroups').select('*').eq('group_id', group.id).order('sort_order');

    if (subgroups && subgroups.length) {
      for (const sg of subgroups) {
        const sgCard = await buildSubgroupAdminCard(sg, group);
        sgArea.appendChild(sgCard);
      }
    } else {
      const hint = document.createElement('p');
      hint.style.cssText = 'font-size:12px;color:var(--text-dim);margin-left:8px;';
      hint.textContent = 'No subgroups yet. Click "+ Subgroup" to add one.';
      sgArea.appendChild(hint);
    }
  } catch { /* silent */ }

  card.appendChild(sgArea);
  return card;
}

async function buildSubgroupAdminCard(sg, group) {
  const sgCard = document.createElement('div');
  sgCard.className = 'subgroup-card';
  sgCard.id = 'sg-card-' + sg.id;

  const sgHeader = document.createElement('div');
  sgHeader.className = 'subgroup-card-header';
  sgHeader.addEventListener('click', () => sgCard.classList.toggle('open'));

  const sgLeft = document.createElement('div');
  sgLeft.style.cssText = 'display:flex;align-items:center;gap:10px;';
  const expand = document.createElement('span');
  expand.className = 'expand-icon';
  expand.textContent = '▾';
  const sgName = document.createElement('span');
  sgName.style.cssText = 'font-family:var(--font-head);font-weight:700;font-size:14px;text-transform:uppercase;';
  sgName.textContent = safeText(sg.name);
  sgLeft.appendChild(expand);
  sgLeft.appendChild(sgName);
  sgHeader.appendChild(sgLeft);

  const sgActions = document.createElement('div');
  sgActions.className = 'admin-card-actions';
  sgActions.addEventListener('click', e => e.stopPropagation());

  const addPBtn = buildIconBtn('+ Product', false, () => openProductModal(null, sg.id));
  addPBtn.style.cssText = 'padding:0 10px;font-size:10px;font-family:var(--font-head);font-weight:700;letter-spacing:1px;text-transform:uppercase;height:28px;border-radius:5px;border:1px solid var(--border);color:var(--text-3);background:none;cursor:pointer;transition:var(--transition);';

  const editSgBtn = buildIconBtn('✎', false, () => openSubgroupModal(sg, group.id));
  const delSgBtn = buildIconBtn('✕', true, () => confirmDelete('subgroup', sg.id, sg.name));

  sgActions.appendChild(addPBtn);
  sgActions.appendChild(editSgBtn);
  sgActions.appendChild(delSgBtn);
  sgHeader.appendChild(sgActions);
  sgCard.appendChild(sgHeader);

  // Products list
  const productsWrap = document.createElement('div');
  productsWrap.className = 'subgroup-products';

  try {
    const sb = getSupabase();
    const { data: products } = await sb
      .from('products').select('*').eq('subgroup_id', sg.id).order('sort_order');

    if (products && products.length) {
      const tbl = document.createElement('table');
      tbl.className = 'admin-table';
      tbl.style.marginTop = '12px';

      const thead = document.createElement('thead');
      const hr = document.createElement('tr');
      ['Image','Name','Strain','Price','Stock','Actions'].forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        hr.appendChild(th);
      });
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = document.createElement('tbody');
      products.forEach(p => {
        const tr = buildProductTableRow(p, sg, group);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      productsWrap.appendChild(tbl);
    } else {
      const hint = document.createElement('p');
      hint.style.cssText = 'font-size:12px;color:var(--text-dim);padding:12px 0;';
      hint.textContent = 'No products yet. Click "+ Product" to add one.';
      productsWrap.appendChild(hint);
    }
  } catch { /* silent */ }

  sgCard.appendChild(productsWrap);
  return sgCard;
}

function buildProductTableRow(p, sg, group) {
  const tr = document.createElement('tr');
  tr.id = 'product-row-' + p.id;

  // Image
  const tdImg = document.createElement('td');
  if (p.image_url) {
    const img = document.createElement('img');
    img.src = p.image_url;
    img.alt = p.name;
    img.className = 'product-thumb';
    tdImg.appendChild(img);
  }
  tr.appendChild(tdImg);

  // Name
  const tdName = document.createElement('td');
  const nameEl = document.createElement('strong');
  nameEl.textContent = safeText(p.name);
  tdName.appendChild(nameEl);
  tr.appendChild(tdName);

  // Strain
  const tdStrain = document.createElement('td');
  const strainBadge = document.createElement('span');
  strainBadge.className = 'badge badge-' + (p.strain_type || 'hybrid');
  strainBadge.textContent = p.strain_type || 'hybrid';
  tdStrain.appendChild(strainBadge);
  tr.appendChild(tdStrain);

  // Price
  const tdPrice = document.createElement('td');
  tdPrice.textContent = formatPrice(p.price);
  tdPrice.style.color = 'var(--gold)';
  tr.appendChild(tdPrice);

  // Stock
  const tdStock = document.createElement('td');
  const stockBadge = document.createElement('span');
  stockBadge.className = 'stock-badge ' + (p.in_stock ? 'in-stock' : 'out-stock');
  stockBadge.textContent = p.in_stock ? 'In Stock' : 'Out of Stock';
  stockBadge.style.cursor = 'pointer';
  stockBadge.addEventListener('click', () => toggleStock(p.id, !p.in_stock, stockBadge));
  tdStock.appendChild(stockBadge);
  tr.appendChild(tdStock);

  // Actions
  const tdActions = document.createElement('td');
  const actWrap = document.createElement('div');
  actWrap.style.cssText = 'display:flex;gap:6px;';
  actWrap.appendChild(buildIconBtn('✎', false, () => openProductModal(p, sg.id)));
  actWrap.appendChild(buildIconBtn('✕', true, () => confirmDelete('product', p.id, p.name)));
  tdActions.appendChild(actWrap);
  tr.appendChild(tdActions);

  return tr;
}

// =============================================
// WHOLESALE TAB
// =============================================
async function loadWholesaleProducts() {
  const tbody = document.getElementById('wholesale-body');
  if (!tbody) return;
  tbody.replaceChildren();

  try {
    const sb = getSupabase();
    let query = sb.from('products')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: products, error } = await query;
    if (error) throw error;

    // Filter: wholesale products = have options OR were saved with price=0 (wholesale marker)
    const filtered = products.filter(p =>
      (p.wholesale_options && p.wholesale_options.length > 0) ||
      (p.price === 0 && p.subgroup_id === null && p.group_id === null)
    );

    if (!filtered.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted);font-size:14px;';
      td.textContent = 'No wholesale products found. Click \'+ New Wholesale Product\' to add one.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    filtered.forEach(p => {
      const tr = document.createElement('tr');

      const tdImg = document.createElement('td');
      if (p.image_url) {
        const img = document.createElement('img');
        img.src = p.image_url; img.alt = p.name; img.className = 'product-thumb';
        tdImg.appendChild(img);
      }
      tr.appendChild(tdImg);

      const tdName = document.createElement('td');
      const n = document.createElement('strong'); n.textContent = safeText(p.name);
      tdName.appendChild(n);
      tr.appendChild(tdName);

      const tdStrain = document.createElement('td');
      const sb2 = document.createElement('span');
      sb2.className = 'badge badge-' + (p.strain_type || 'hybrid');
      sb2.textContent = p.strain_type || 'hybrid';
      tdStrain.appendChild(sb2);
      tr.appendChild(tdStrain);

      const tdOptions = document.createElement('td');
      tdOptions.style.color = 'var(--text-muted)';
      tdOptions.style.fontSize = '12px';
      tdOptions.innerHTML = p.wholesale_options.map(o => `${o.label} (${formatPrice(o.price)})`).join('<br>');
      tr.appendChild(tdOptions);

      const tdStock = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'stock-badge ' + (p.in_stock ? 'in-stock' : 'out-stock');
      badge.textContent = p.in_stock ? 'In Stock' : 'Out of Stock';
      badge.style.cursor = 'pointer';
      badge.addEventListener('click', () => toggleStock(p.id, !p.in_stock, badge));
      tdStock.appendChild(badge);
      tr.appendChild(tdStock);

      const tdActions = document.createElement('td');
      const actWrap = document.createElement('div');
      actWrap.style.cssText = 'display:flex;gap:6px;';
      actWrap.appendChild(buildIconBtn('✎', false, () => openProductModal(p, null, 'wholesale_magic_flag')));
      actWrap.appendChild(buildIconBtn('✕', true, () => confirmDelete('product', p.id, p.name)));
      tdActions.appendChild(actWrap);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  } catch {
    showToast('Failed to load wholesale products', 'error');
  }
}

// =============================================
// ALL PRODUCTS TAB
// =============================================
async function loadAllProducts() {
  const tbody = document.getElementById('all-products-body');
  if (!tbody) return;
  tbody.replaceChildren();

  const filterGroupId = document.getElementById('filter-group')?.value || '';

  try {
    const sb = getSupabase();
    let query = sb.from('products')
      .select('*, product_subgroups(name, group_id, product_groups(name))')
      .order('created_at', { ascending: false });

    const { data: products, error } = await query;
    if (error) throw error;

    const filtered = filterGroupId
      ? products.filter(p => p.product_subgroups?.group_id === filterGroupId)
      : products;

    if (!filtered.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted);';
      td.textContent = 'No products found.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    filtered.forEach(p => {
      const sg = p.product_subgroups || {};
      const group = sg.product_groups || {};

      const tr = document.createElement('tr');

      const tdImg = document.createElement('td');
      if (p.image_url) {
        const img = document.createElement('img');
        img.src = p.image_url; img.alt = p.name; img.className = 'product-thumb';
        tdImg.appendChild(img);
      }
      tr.appendChild(tdImg);

      const tdName = document.createElement('td');
      const n = document.createElement('strong'); n.textContent = safeText(p.name);
      tdName.appendChild(n);
      tr.appendChild(tdName);

      const tdGroup = document.createElement('td');
      tdGroup.style.color = 'var(--text-muted)';
      tdGroup.textContent = (group.name || '') + (sg.name ? ' / ' + sg.name : '');
      tr.appendChild(tdGroup);

      const tdStrain = document.createElement('td');
      const sb2 = document.createElement('span');
      sb2.className = 'badge badge-' + (p.strain_type || 'hybrid');
      sb2.textContent = p.strain_type || 'hybrid';
      tdStrain.appendChild(sb2);
      tr.appendChild(tdStrain);

      const tdPrice = document.createElement('td');
      tdPrice.textContent = formatPrice(p.price);
      tdPrice.style.color = 'var(--gold)';
      tr.appendChild(tdPrice);

      const tdStock = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'stock-badge ' + (p.in_stock ? 'in-stock' : 'out-stock');
      badge.textContent = p.in_stock ? 'In Stock' : 'Out of Stock';
      badge.style.cursor = 'pointer';
      badge.addEventListener('click', () => toggleStock(p.id, !p.in_stock, badge));
      tdStock.appendChild(badge);
      tr.appendChild(tdStock);

      const tdActions = document.createElement('td');
      const actWrap = document.createElement('div');
      actWrap.style.cssText = 'display:flex;gap:6px;';
      actWrap.appendChild(buildIconBtn('✎', false, () => openProductModal(p, p.subgroup_id)));
      actWrap.appendChild(buildIconBtn('✕', true, () => confirmDelete('product', p.id, p.name)));
      tdActions.appendChild(actWrap);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  } catch {
    showToast('Failed to load products', 'error');
  }
}

async function populateGroupFilter() {
  const sel = document.getElementById('filter-group');
  if (!sel) return;
  try {
    const groups = await fetchGroups();
    groups.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.name;
      sel.appendChild(opt);
    });
  } catch { /* ignore */ }
}

// =============================================
// Stock Toggle
// =============================================
async function toggleStock(productId, newState, badgeEl) {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('products').update({ in_stock: newState }).eq('id', productId);
    if (error) throw error;
    badgeEl.className = 'stock-badge ' + (newState ? 'in-stock' : 'out-stock');
    badgeEl.textContent = newState ? 'In Stock' : 'Out of Stock';
    showToast('Stock updated', 'success');
  } catch {
    showToast('Failed to update stock', 'error');
  }
}

// =============================================
// DELETE
// =============================================
let _deleteCallback = null;

function confirmDelete(type, id, name) {
  const modal = document.getElementById('delete-modal');
  const msg = document.getElementById('delete-msg');
  const btn = document.getElementById('delete-confirm-btn');
  if (!modal || !msg || !btn) return;

  msg.textContent = 'Are you sure you want to delete "' + safeText(name) + '"? This cannot be undone.';

  _deleteCallback = async () => {
    try {
      const sb = getSupabase();
      const table = type === 'group' ? 'product_groups'
                  : type === 'subgroup' ? 'product_subgroups'
                  : 'products';
      const { error } = await sb.from(table).delete().eq('id', id);
      if (error) throw error;
      closeModal('delete-modal');
      showToast('Deleted successfully', 'success');
      await loadGroupsTab();
      if (document.getElementById('tab-products').classList.contains('active')) {
        await loadAllProducts();
      }
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  btn.onclick = _deleteCallback;
  openModalEl('delete-modal');
}

// =============================================
// MODAL HELPERS
// =============================================
function openModalEl(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// Close on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

function buildIconBtn(icon, isDanger, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-icon' + (isDanger ? ' danger' : '');
  btn.textContent = icon;
  btn.addEventListener('click', onClick);
  return btn;
}

// =============================================
// GROUP MODAL
// =============================================
function openGroupModal(group = null) {
  const titleEl = document.getElementById('group-modal-title');
  if (titleEl) titleEl.textContent = group ? 'Edit Group' : 'New Product Group';

  document.getElementById('gf-id').value = group ? group.id : '';
  document.getElementById('gf-name').value = group ? safeText(group.name) : '';
  document.getElementById('gf-slug').value = group ? safeText(group.slug) : '';
  document.getElementById('gf-tagline').value = group ? safeText(group.tagline || '') : '';
  document.getElementById('gf-desc').value = group ? safeText(group.description || '') : '';
  document.getElementById('gf-order').value = group ? (group.sort_order || 0) : 0;
  document.getElementById('gf-img-preview-wrap').textContent = group?.hero_image_url ? 'Current image saved. Upload new to replace.' : 'Click to upload image (JPEG, PNG, WebP · max 5MB)';
  document.getElementById('gf-vid-preview-wrap').textContent = group?.video_url ? 'Current video saved. Upload new to replace.' : 'Click to upload video (MP4, WebM · max 50MB)';
  document.getElementById('gf-img-file').value = '';
  document.getElementById('gf-vid-file').value = '';

  openModalEl('group-modal');
}

// =============================================
// SUBGROUP MODAL
// =============================================
function openSubgroupModal(sg = null, groupId) {
  const titleEl = document.getElementById('sg-modal-title');
  if (titleEl) titleEl.textContent = sg ? 'Edit Subgroup' : 'New Subgroup';

  document.getElementById('sgf-id').value = sg ? sg.id : '';
  document.getElementById('sgf-group-id').value = groupId;
  document.getElementById('sgf-name').value = sg ? safeText(sg.name) : '';
  document.getElementById('sgf-slug').value = sg ? safeText(sg.slug) : '';
  document.getElementById('sgf-desc').value = sg ? safeText(sg.description || '') : '';
  document.getElementById('sgf-order').value = sg ? (sg.sort_order || 0) : 0;

  openModalEl('subgroup-modal');
}

// =============================================
// PRODUCT MODAL
// =============================================
let currentWholesaleOptions = [];

function renderWholesaleOptions() {
  const list = document.getElementById('wholesale-options-list');
  if (!list) return;
  list.innerHTML = '';
  currentWholesaleOptions.forEach((opt, idx) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:8px; align-items:center;';
    
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'form-input';
    labelInput.placeholder = 'E.g. 50 Carts';
    labelInput.value = opt.label || '';
    labelInput.style.flex = '2';
    labelInput.oninput = (e) => { currentWholesaleOptions[idx].label = e.target.value; };
    
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'form-input';
    priceInput.placeholder = 'Price ($)';
    priceInput.value = opt.price || '';
    priceInput.style.flex = '1';
    priceInput.min = '0';
    priceInput.step = '0.01';
    priceInput.oninput = (e) => { currentWholesaleOptions[idx].price = parseFloat(e.target.value) || 0; };
    
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = '✕';
    delBtn.style.cssText = 'background:none; border:none; color:#e55; cursor:pointer; font-size:14px; padding:4px 8px;';
    delBtn.onclick = () => {
      currentWholesaleOptions.splice(idx, 1);
      renderWholesaleOptions();
    };
    
    row.appendChild(labelInput);
    row.appendChild(priceInput);
    row.appendChild(delBtn);
    list.appendChild(row);
  });
}

document.getElementById('btn-add-option')?.addEventListener('click', () => {
  currentWholesaleOptions.push({ label: '', price: '' });
  renderWholesaleOptions();
});

function openProductModal(product = null, subgroupId = null, groupId = null) {
  const titleEl = document.getElementById('pf-modal-title');
  if (titleEl) titleEl.textContent = product ? 'Edit Product' : 'New Product';

  document.getElementById('pf-id').value = product ? product.id : '';
  document.getElementById('pf-subgroup-id').value = subgroupId || '';
  document.getElementById('pf-group-id').value = groupId || (product ? product.group_id : '') || '';
  document.getElementById('pf-name').value = product ? safeText(product.name) : '';
  document.getElementById('pf-slug').value = product ? safeText(product.slug) : '';
  document.getElementById('pf-strain').value = product ? (product.strain_type || 'hybrid') : 'hybrid';
  
  // if groupId is wholesale_magic_flag, it's definitely wholesale.
  // otherwise, if product has wholesale_options length > 0, it's wholesale.
  const isWholesale = groupId === 'wholesale_magic_flag' || (product && product.wholesale_options && product.wholesale_options.length > 0);
  
  if (isWholesale) {
    document.getElementById('pf-price-group').style.display = 'none';
    document.getElementById('pf-price').required = false;
    document.getElementById('pf-price').value = '0';
    document.getElementById('pf-wholesale-wrap').style.display = 'block';
    currentWholesaleOptions = product?.wholesale_options ? [...product.wholesale_options] : [];
    renderWholesaleOptions();
  } else {
    document.getElementById('pf-price-group').style.display = 'block';
    document.getElementById('pf-price').required = true;
    document.getElementById('pf-price').value = product ? (product.price || '') : '';
    document.getElementById('pf-wholesale-wrap').style.display = 'none';
    currentWholesaleOptions = [];
  }

  document.getElementById('pf-desc').value = product ? safeText(product.description || '') : '';
  document.getElementById('pf-ingredients').value = product ? safeText(product.ingredients || '') : '';
  document.getElementById('pf-order').value = product ? (product.sort_order || 0) : 0;
  document.getElementById('pf-stock').checked = product ? !!product.in_stock : true;
  document.getElementById('pf-img-preview-wrap').textContent = product?.image_url ? 'Current image saved. Upload new to replace.' : 'Click to upload image (JPEG, PNG, WebP · max 5MB)';
  document.getElementById('pf-lab-preview-wrap').textContent = product?.lab_result_url ? 'Current lab results saved. Upload new PDF to replace.' : 'Click to upload lab results (PDF · max 5MB)';
  document.getElementById('pf-img-file').value = '';
  document.getElementById('pf-lab-file').value = '';

  openModalEl('product-modal');
}

// =============================================
// FILE UPLOAD HELPERS
// =============================================
// TODO(security): File content validation (magic bytes) would require a
// server-side function. Client-side MIME check is a best-effort measure.

function validateFile(file, allowedTypes, maxMB) {
  if (!allowedTypes.includes(file.type)) {
    showToast('Invalid file type: ' + file.type, 'error');
    return false;
  }
  if (file.size > maxMB * 1024 * 1024) {
    showToast('File too large. Max ' + maxMB + 'MB.', 'error');
    return false;
  }
  return true;
}

async function uploadFile(file, bucket, folder) {
  const sb = getSupabase();
  // Generate UUID-based filename to prevent traversal/guessing
  const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
  const filename = folder + '/' + crypto.randomUUID() + '.' + ext;

  const { data, error } = await sb.storage.from(bucket).upload(filename, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  const { data: { publicUrl } } = sb.storage.from(bucket).getPublicUrl(filename);
  return publicUrl;
}

// =============================================
// FORMS — init + validation + submit
// =============================================
function initForms() {
  // Auto-slug on name input
  ['gf', 'sgf', 'pf'].forEach(prefix => {
    const nameInput = document.getElementById(prefix + '-name');
    const slugInput = document.getElementById(prefix + '-slug');
    if (nameInput && slugInput) {
      nameInput.addEventListener('input', () => {
        if (!slugInput.dataset.manual) {
          slugInput.value = slugify(nameInput.value);
        }
      });
      slugInput.addEventListener('input', () => { slugInput.dataset.manual = '1'; });
    }
  });

  // Image & File preview
  setupFilePreview('gf-img-file', 'gf-img-preview-wrap', 'image', 5);
  setupFilePreview('gf-vid-file', 'gf-vid-preview-wrap', 'video', 50);
  setupFilePreview('pf-img-file', 'pf-img-preview-wrap', 'image', 5);
  setupFilePreview('pf-lab-file', 'pf-lab-preview-wrap', 'pdf', 5);

  // Group form submit
  document.getElementById('group-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('gf-submit');
    btn.disabled = true; btn.textContent = 'Saving…';

    try {
      const id = document.getElementById('gf-id').value;
      const name = document.getElementById('gf-name').value.trim().substring(0, 100);
      const slug = slugify(document.getElementById('gf-slug').value.trim()).substring(0, 80);
      const tagline = document.getElementById('gf-tagline').value.trim().substring(0, 200);
      const description = document.getElementById('gf-desc').value.trim().substring(0, 1000);
      const sort_order = Math.max(0, parseInt(document.getElementById('gf-order').value) || 0);

      if (!name || !slug) { showToast('Name and slug are required.', 'error'); return; }

      let hero_image_url = null;
      let video_url = null;

      const imgFile = document.getElementById('gf-img-file').files[0];
      if (imgFile) {
        if (!validateFile(imgFile, ['image/jpeg','image/png','image/webp'], 5)) return;
        hero_image_url = await uploadFile(imgFile, 'hero-images', 'groups');
      }

      const vidFile = document.getElementById('gf-vid-file').files[0];
      if (vidFile) {
        if (!validateFile(vidFile, ['video/mp4','video/webm'], 50)) return;
        video_url = await uploadFile(vidFile, 'product-videos', 'groups');
      }

      const sb = getSupabase();
      const payload = { name, slug, tagline, description, sort_order };
      if (hero_image_url) payload.hero_image_url = hero_image_url;
      if (video_url) payload.video_url = video_url;

      let error;
      if (id) {
        ({ error } = await sb.from('product_groups').update(payload).eq('id', id));
      } else {
        ({ error } = await sb.from('product_groups').insert(payload));
      }
      if (error) throw error;

      closeModal('group-modal');
      showToast('Group saved!', 'success');
      await loadGroupsTab();
      await populateGroupFilter();
    } catch (err) {
      console.error('Group save error');
      showToast('Failed to save group.', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Save Group';
    }
  });

  // Subgroup form submit
  document.getElementById('subgroup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('sgf-submit');
    btn.disabled = true; btn.textContent = 'Saving…';

    try {
      const id = document.getElementById('sgf-id').value;
      const group_id = document.getElementById('sgf-group-id').value;
      const name = document.getElementById('sgf-name').value.trim().substring(0, 100);
      const slug = slugify(document.getElementById('sgf-slug').value.trim()).substring(0, 80);
      const description = document.getElementById('sgf-desc').value.trim().substring(0, 800);
      const sort_order = Math.max(0, parseInt(document.getElementById('sgf-order').value) || 0);

      if (!name || !slug) { showToast('Name and slug are required.', 'error'); return; }

      const sb = getSupabase();
      const payload = { group_id, name, slug, description, sort_order };
      let error;
      if (id) {
        ({ error } = await sb.from('product_subgroups').update(payload).eq('id', id));
      } else {
        ({ error } = await sb.from('product_subgroups').insert(payload));
      }
      if (error) throw error;

      closeModal('subgroup-modal');
      showToast('Subgroup saved!', 'success');
      await loadGroupsTab();
    } catch {
      showToast('Failed to save subgroup.', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Save Subgroup';
    }
  });


  // Product form: no longer relies on submit event.
  // saveProduct() is called directly by the button onclick.
}

// =============================================
// SAVE PRODUCT — global function, called by button onclick
// =============================================
async function saveProduct() {
  const btn = document.getElementById('pf-submit');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const id = document.getElementById('pf-id').value;
    const subgroup_id = document.getElementById('pf-subgroup-id').value || null;
    let group_id = document.getElementById('pf-group-id').value || null;
    if (group_id === 'wholesale_magic_flag') group_id = null;

    const name = document.getElementById('pf-name').value.trim().substring(0, 150);
    const slug = slugify(document.getElementById('pf-slug').value.trim()).substring(0, 100);
    const strain_type = document.getElementById('pf-strain').value;
    const priceRaw = parseFloat(document.getElementById('pf-price').value);
    const price = isNaN(priceRaw) ? 0 : Math.max(0, Math.min(priceRaw, 99999));
    const description = document.getElementById('pf-desc').value.trim().substring(0, 1000);
    const ingredients = document.getElementById('pf-ingredients').value.trim().substring(0, 1000);
    const sort_order = Math.max(0, parseInt(document.getElementById('pf-order').value) || 0);
    const in_stock = document.getElementById('pf-stock').checked;

    // Clean wholesale options — ensure prices are numbers, strip empties
    const wholesale_options = currentWholesaleOptions
      .filter(o => o.label && String(o.label).trim() !== '')
      .map(o => ({ label: String(o.label).trim(), price: parseFloat(o.price) || 0 }));

    // Determine if this is a wholesale product
    const isWholesaleProduct = document.getElementById('pf-wholesale-wrap').style.display !== 'none';

    if (!name) {
      showToast('Product name is required.', 'error');
      btn.disabled = false; btn.textContent = 'Save Product';
      return;
    }
    if (!slug) {
      showToast('URL slug is required.', 'error');
      btn.disabled = false; btn.textContent = 'Save Product';
      return;
    }
    if (!['sativa', 'indica', 'hybrid', 'cbd'].includes(strain_type)) {
      showToast('Invalid strain type.', 'error');
      btn.disabled = false; btn.textContent = 'Save Product';
      return;
    }
    // Require at least 1 option for wholesale products
    if (isWholesaleProduct && wholesale_options.length === 0) {
      showToast('Please add at least one wholesale option (e.g. "10 Carts") before saving.', 'error');
      btn.disabled = false; btn.textContent = 'Save Product';
      return;
    }

    // Handle optional image upload
    let image_url = null;
    const imgFile = document.getElementById('pf-img-file').files[0];
    if (imgFile) {
      if (!validateFile(imgFile, ['image/jpeg', 'image/png', 'image/webp'], 5)) {
        btn.disabled = false; btn.textContent = 'Save Product';
        return;
      }
      try {
        image_url = await uploadFile(imgFile, 'product-images', 'products');
      } catch (uploadErr) {
        showToast('Image upload failed: ' + (uploadErr?.message || 'unknown'), 'error');
        btn.disabled = false; btn.textContent = 'Save Product';
        return;
      }
    }

    // Handle optional lab PDF upload
    let lab_result_url = null;
    const labFile = document.getElementById('pf-lab-file').files[0];
    if (labFile) {
      if (!validateFile(labFile, ['application/pdf'], 5)) {
        btn.disabled = false; btn.textContent = 'Save Product';
        return;
      }
      try {
        lab_result_url = await uploadFile(labFile, 'lab-results', 'products');
      } catch (uploadErr) {
        showToast('Lab PDF upload failed: ' + (uploadErr?.message || 'unknown'), 'error');
        btn.disabled = false; btn.textContent = 'Save Product';
        return;
      }
    }

    const sb = getSupabase();

    const payload = {
      subgroup_id,
      group_id,
      wholesale_options,
      name,
      slug,
      strain_type,
      price,
      description,
      ingredients,
      sort_order,
      in_stock,
    };
    if (image_url) payload.image_url = image_url;
    if (lab_result_url) payload.lab_result_url = lab_result_url;

    console.log("Saving payload to Supabase:", payload);

    let error, data;
    if (id) {
      // Add .select() so we can verify the row was actually updated
      ({ data, error } = await sb.from('products').update(payload).eq('id', id).select());
      if (!error && (!data || data.length === 0)) {
        error = { message: "Update blocked by database security policies (RLS). Please check your Supabase SQL policies." };
      }
    } else {
      ({ data, error } = await sb.from('products').insert(payload).select());
    }

    if (error) {
      console.error('Supabase save error:', error);
      showToast('Save failed: ' + (error.message || JSON.stringify(error)).substring(0, 120), 'error');
      btn.disabled = false; btn.textContent = 'Save Product';
      return;
    }

    console.log("Saved successfully:", data);

    closeModal('product-modal');
    showToast('Product saved! ✓', 'success');
    await loadGroupsTab();

    if (document.getElementById('tab-wholesale')?.classList.contains('active')) {
      await loadWholesaleProducts();
    }
    if (document.getElementById('tab-products')?.classList.contains('active')) {
      await loadAllProducts();
    }

  } catch (err) {
    console.error('saveProduct unexpected error:', err);
    const msg = err?.message || (typeof err === 'string' ? err : 'Unknown error');
    showToast('Unexpected error: ' + msg.substring(0, 100), 'error');
    btn.disabled = false; btn.textContent = 'Save Product';
  }
}

function setupFilePreview(inputId, previewId, type, maxMB) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const allowed = type === 'image'
      ? ['image/jpeg','image/png','image/webp']
      : type === 'pdf'
      ? ['application/pdf']
      : ['video/mp4','video/webm'];
    if (!validateFile(file, allowed, maxMB)) { input.value = ''; return; }

    preview.replaceChildren();
    if (type === 'image') {
      const img = document.createElement('img');
      img.className = 'upload-preview';
      img.alt = 'Preview';
      img.src = URL.createObjectURL(file);
      preview.appendChild(img);
    } else if (type === 'pdf') {
      const span = document.createElement('span');
      span.textContent = '✓ PDF selected: ' + file.name.substring(0, 40);
      span.style.color = 'var(--gold)';
      preview.appendChild(span);
    } else {
      const span = document.createElement('span');
      span.textContent = '✓ Video selected: ' + file.name.substring(0, 40);
      span.style.color = 'var(--gold)';
      preview.appendChild(span);
    }
  });
}
