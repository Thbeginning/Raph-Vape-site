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
    if (addBtn) { addBtn.textContent = '+ New Group'; addBtn.onclick = () => openGroupModal(); }
    loadGroupsTab();
  } else {
    document.getElementById('tab-products').classList.add('active');
    document.getElementById('tab-products-btn').classList.add('active');
    if (titleEl) titleEl.textContent = 'All Products';
    if (addBtn) { addBtn.style.display = 'none'; }
    loadAllProducts();
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
function openProductModal(product = null, subgroupId) {
  const titleEl = document.getElementById('pf-modal-title');
  if (titleEl) titleEl.textContent = product ? 'Edit Product' : 'New Product';

  document.getElementById('pf-id').value = product ? product.id : '';
  document.getElementById('pf-subgroup-id').value = subgroupId;
  document.getElementById('pf-name').value = product ? safeText(product.name) : '';
  document.getElementById('pf-slug').value = product ? safeText(product.slug) : '';
  document.getElementById('pf-strain').value = product ? (product.strain_type || 'hybrid') : 'hybrid';
  document.getElementById('pf-price').value = product ? (product.price || '') : '';
  document.getElementById('pf-desc').value = product ? safeText(product.description || '') : '';
  document.getElementById('pf-order').value = product ? (product.sort_order || 0) : 0;
  document.getElementById('pf-stock').checked = product ? !!product.in_stock : true;
  document.getElementById('pf-img-preview-wrap').textContent = product?.image_url ? 'Current image saved. Upload new to replace.' : 'Click to upload image (JPEG, PNG, WebP · max 5MB)';
  document.getElementById('pf-img-file').value = '';

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

  // Image preview
  setupFilePreview('gf-img-file', 'gf-img-preview-wrap', 'image', 5);
  setupFilePreview('gf-vid-file', 'gf-vid-preview-wrap', 'video', 50);
  setupFilePreview('pf-img-file', 'pf-img-preview-wrap', 'image', 5);

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

  // Product form submit
  document.getElementById('product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('pf-submit');
    btn.disabled = true; btn.textContent = 'Saving…';

    try {
      const id = document.getElementById('pf-id').value;
      const subgroup_id = document.getElementById('pf-subgroup-id').value;
      const name = document.getElementById('pf-name').value.trim().substring(0, 150);
      const slug = slugify(document.getElementById('pf-slug').value.trim()).substring(0, 100);
      const strain_type = document.getElementById('pf-strain').value;
      const priceRaw = parseFloat(document.getElementById('pf-price').value);
      const price = isNaN(priceRaw) ? 0 : Math.max(0, Math.min(priceRaw, 9999));
      const description = document.getElementById('pf-desc').value.trim().substring(0, 1000);
      const sort_order = Math.max(0, parseInt(document.getElementById('pf-order').value) || 0);
      const in_stock = document.getElementById('pf-stock').checked;

      if (!name || !slug) { showToast('Name and slug are required.', 'error'); return; }
      if (!['sativa','indica','hybrid','cbd'].includes(strain_type)) {
        showToast('Invalid strain type.', 'error'); return;
      }

      let image_url = null;
      const imgFile = document.getElementById('pf-img-file').files[0];
      if (imgFile) {
        if (!validateFile(imgFile, ['image/jpeg','image/png','image/webp'], 5)) return;
        image_url = await uploadFile(imgFile, 'product-images', 'products');
      }

      const sb = getSupabase();
      const payload = { subgroup_id, name, slug, strain_type, price, description, sort_order, in_stock };
      if (image_url) payload.image_url = image_url;

      let error;
      if (id) {
        ({ error } = await sb.from('products').update(payload).eq('id', id));
      } else {
        ({ error } = await sb.from('products').insert(payload));
      }
      if (error) throw error;

      closeModal('product-modal');
      showToast('Product saved!', 'success');
      await loadGroupsTab();
      if (document.getElementById('tab-products').classList.contains('active')) {
        await loadAllProducts();
      }
    } catch {
      showToast('Failed to save product.', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Save Product';
    }
  });
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
      : ['video/mp4','video/webm'];
    if (!validateFile(file, allowed, maxMB)) { input.value = ''; return; }

    preview.replaceChildren();
    if (type === 'image') {
      const img = document.createElement('img');
      img.className = 'upload-preview';
      img.alt = 'Preview';
      img.src = URL.createObjectURL(file);
      preview.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = '✓ Video selected: ' + file.name.substring(0, 40);
      span.style.color = 'var(--gold)';
      preview.appendChild(span);
    }
  });
}
