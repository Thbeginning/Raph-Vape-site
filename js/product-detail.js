// =============================================
// product-detail.js — Product Detail Page
// =============================================

let currentProduct = null;
let qty = 1;

document.addEventListener('DOMContentLoaded', async () => {
  const id = getUrlParam('id');
  if (!id) { window.location.href = 'index.html'; return; }
  await loadProduct(id);
});

async function loadProduct(id) {
  try {
    const product = await fetchProduct(id);
    currentProduct = product;
    renderProduct(product);
    loadRelated(product);
  } catch (err) {
    console.error('Failed to load product');
    const wrap = document.getElementById('product-detail-wrap');
    if (wrap) {
      wrap.replaceChildren();
      const msg = document.createElement('p');
      msg.textContent = 'Product not found or unavailable.';
      msg.style.cssText = 'color:var(--text-muted);padding:80px 0;text-align:center;grid-column:1/-1;';
      wrap.appendChild(msg);
    }
  }
}

function renderProduct(product) {
  const sg = product.product_subgroups;
  const group = sg ? sg.product_groups : null;

  // Page title
  document.title = product.name + ' · MUHAMEDDISPO';
  const metaDesc = document.getElementById('page-desc');
  if (metaDesc) metaDesc.setAttribute('content', product.description || '');

  // Breadcrumb
  if (group) {
    const bcGroup = document.getElementById('bc-group');
    const bcSub = document.getElementById('bc-sub');
    const bcProd = document.getElementById('bc-product');
    if (bcGroup) {
      const a = bcGroup.querySelector('a');
      if (a) {
        a.href = 'products.html?group=' + encodeURIComponent(group.slug);
        a.textContent = group.name;
        a.style.color = 'var(--text-muted)';
        a.addEventListener('mouseover', () => a.style.color = 'var(--gold)');
        a.addEventListener('mouseout', () => a.style.color = 'var(--text-muted)');
      }
    }
    if (bcSub) bcSub.textContent = sg.name;
    if (bcProd) bcProd.textContent = product.name;
  }

  // Image panel
  const imgWrap = document.getElementById('detail-img-wrap');
  imgWrap.replaceChildren();
  if (product.image_url) {
    const img = document.createElement('img');
    img.src = product.image_url;
    img.alt = product.name;
    img.className = 'product-detail__img';
    imgWrap.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.style.cssText = 'height:400px;background:radial-gradient(ellipse at center, rgba(197,179,111,0.1) 0%, transparent 70%);border-radius:16px;';
    imgWrap.appendChild(ph);
  }

  // Info panel
  const info = document.getElementById('detail-info');
  info.replaceChildren();

  // Label
  const label = document.createElement('div');
  label.className = 'product-detail__label';
  label.textContent = (sg ? sg.name + ' · ' : '') + (group ? group.name : '');
  info.appendChild(label);

  // Name
  const name = document.createElement('h1');
  name.className = 'product-detail__name';
  name.textContent = safeText(product.name);
  info.appendChild(name);

  // Badges
  const badges = document.createElement('div');
  badges.className = 'product-card__badges';
  badges.style.marginBottom = '20px';
  if (sg) {
    const sgBadge = document.createElement('span');
    sgBadge.className = 'badge badge-subgroup';
    sgBadge.textContent = sg.name;
    badges.appendChild(sgBadge);
  }
  if (product.strain_type) {
    const strainBadge = document.createElement('span');
    strainBadge.className = 'badge badge-' + product.strain_type.toLowerCase();
    strainBadge.textContent = product.strain_type.charAt(0).toUpperCase() + product.strain_type.slice(1);
    badges.appendChild(strainBadge);
  }
  if (!product.in_stock) {
    const oos = document.createElement('span');
    oos.className = 'badge';
    oos.style.cssText = 'background:#3a1a1a;color:#e55;';
    oos.textContent = 'Out of Stock';
    badges.appendChild(oos);
  }
  info.appendChild(badges);

  // Price
  const price = document.createElement('div');
  price.className = 'product-detail__price';
  price.textContent = product.price > 0 ? formatPrice(product.price) : 'Contact for Price';
  info.appendChild(price);

  // Description
  if (product.description) {
    const desc = document.createElement('p');
    desc.className = 'product-detail__desc';
    desc.textContent = safeText(product.description);
    info.appendChild(desc);
  }

  // Quantity
  const qtyWrap = document.createElement('div');
  qtyWrap.className = 'qty-wrap';
  qtyWrap.setAttribute('aria-label', 'Quantity selector');

  const minusBtn = document.createElement('button');
  minusBtn.className = 'qty-btn';
  minusBtn.type = 'button';
  minusBtn.textContent = '−';
  minusBtn.setAttribute('aria-label', 'Decrease quantity');
  minusBtn.addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    qtyDisplay.textContent = qty;
  });

  const qtyDisplay = document.createElement('span');
  qtyDisplay.className = 'qty-val';
  qtyDisplay.textContent = '1';
  qtyDisplay.setAttribute('aria-live', 'polite');
  qtyDisplay.setAttribute('aria-label', 'Quantity');

  const plusBtn = document.createElement('button');
  plusBtn.className = 'qty-btn';
  plusBtn.type = 'button';
  plusBtn.textContent = '+';
  plusBtn.setAttribute('aria-label', 'Increase quantity');
  plusBtn.addEventListener('click', () => {
    qty = Math.min(99, qty + 1);
    qtyDisplay.textContent = qty;
  });

  qtyWrap.appendChild(minusBtn);
  qtyWrap.appendChild(qtyDisplay);
  qtyWrap.appendChild(plusBtn);
  info.appendChild(qtyWrap);

  // Add to Cart button
  const cartBtn = document.createElement('button');
  cartBtn.className = 'btn-add-cart';
  cartBtn.type = 'button';
  cartBtn.textContent = product.in_stock ? 'Add to Cart' : 'Out of Stock';
  if (!product.in_stock) cartBtn.disabled = true;
  cartBtn.addEventListener('click', () => {
    addToCart({
      ...product,
      subgroupName: sg ? sg.name : ''
    }, qty);
  });
  info.appendChild(cartBtn);

  // Continue shopping link
  if (group) {
    const cont = document.createElement('a');
    cont.href = 'products.html?group=' + encodeURIComponent(group.slug);
    cont.style.cssText = 'display:block;margin-top:16px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted);transition:color 0.2s;';
    cont.textContent = '← Back to ' + group.name;
    cont.addEventListener('mouseover', () => cont.style.color = 'var(--gold)');
    cont.addEventListener('mouseout', () => cont.style.color = 'var(--text-muted)');
    info.appendChild(cont);
  }
}

async function loadRelated(product) {
  try {
    const related = await fetchProductsBySubgroup(product.subgroup_id);
    const others = related.filter(p => p.id !== product.id).slice(0, 6);
    if (others.length === 0) return;

    const section = document.getElementById('related-section');
    const rail = document.getElementById('related-rail');
    if (!section || !rail) return;

    const sg = product.product_subgroups;
    others.forEach(p => {
      const card = buildRelatedCard(p, sg ? sg.name : '');
      rail.appendChild(card);
    });
    section.style.display = 'block';
  } catch { /* silent fail for related products */ }
}

function buildRelatedCard(product, subgroupName) {
  const a = document.createElement('a');
  a.href = 'product-detail.html?id=' + encodeURIComponent(product.id);
  a.className = 'product-card';
  a.setAttribute('role', 'listitem');

  const imgWrap = document.createElement('div');
  imgWrap.className = 'product-card__img-wrap';
  if (product.image_url) {
    const img = document.createElement('img');
    img.src = product.image_url;
    img.alt = product.name;
    img.className = 'product-card__img';
    img.loading = 'lazy';
    imgWrap.appendChild(img);
  }
  a.appendChild(imgWrap);

  const divider = document.createElement('div');
  divider.className = 'product-card__divider';
  a.appendChild(divider);

  const body = document.createElement('div');
  body.className = 'product-card__body';

  const name = document.createElement('div');
  name.className = 'product-card__name';
  name.textContent = safeText(product.name);
  body.appendChild(name);

  const price = document.createElement('div');
  price.className = 'product-card__price';
  price.textContent = product.price > 0 ? formatPrice(product.price) : 'Contact for Price';
  body.appendChild(price);

  const cartBtn = document.createElement('button');
  cartBtn.className = 'product-card__cart-btn';
  cartBtn.type = 'button';
  cartBtn.textContent = 'Add to Cart';
  cartBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({ ...product, subgroupName });
  });
  body.appendChild(cartBtn);
  a.appendChild(body);
  return a;
}
