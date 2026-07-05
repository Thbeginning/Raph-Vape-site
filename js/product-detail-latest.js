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

  // === DYNAMIC SEO META UPDATE ===
  const pageTitle = product.name + ' — ' + (sg ? sg.name + ' · ' : '') + 'MUHAMEDDISPO';
  const pageDesc = product.description
    ? product.description.substring(0, 160)
    : 'Buy ' + product.name + ' from MUHAMEDDISPO — premium ' + (sg ? sg.name : 'vape') + ' product.';
  const pageUrl = 'https://muhameddispo.com/product-detail.html?id=' + encodeURIComponent(product.id);
  const pageImage = product.image_url || 'https://muhameddispo.com/Logo.png';

  document.title = pageTitle;
  const setMetaId = (id, attr, val) => { const el = document.getElementById(id); if (el) el.setAttribute(attr, val); };
  setMetaId('page-desc', 'content', pageDesc);
  setMetaId('page-canonical', 'href', pageUrl);
  setMetaId('og-title', 'content', pageTitle);
  setMetaId('og-desc', 'content', pageDesc);
  setMetaId('og-image', 'content', pageImage);
  setMetaId('og-url', 'content', pageUrl);
  setMetaId('tw-title', 'content', pageTitle);
  setMetaId('tw-desc', 'content', pageDesc);
  setMetaId('tw-image', 'content', pageImage);

  // === PRODUCT SCHEMA (JSON-LD) — unlocks Google rich results ===
  const isWholesaleSchema = product.wholesale_options && product.wholesale_options.length > 0;
  const priceForSchema = isWholesaleSchema
    ? Math.min(...product.wholesale_options.map(o => o.price))
    : (product.price || 0);
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: pageImage,
    description: product.description || '',
    brand: { '@type': 'Brand', name: 'MUHAMEDDISPO' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: priceForSchema.toFixed(2),
      availability: product.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'MUHAMEDDISPO' }
    }
  };
  // BreadcrumbList schema
  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://muhameddispo.com/' }
  ];
  if (group) breadcrumbItems.push({ '@type': 'ListItem', position: 2, name: group.name, item: 'https://muhameddispo.com/products.html?group=' + encodeURIComponent(group.slug) });
  if (sg)    breadcrumbItems.push({ '@type': 'ListItem', position: 3, name: sg.name });
  breadcrumbItems.push({ '@type': 'ListItem', position: breadcrumbItems.length + 1, name: product.name });
  const breadcrumbSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbItems };

  // Remove any existing schema scripts from previous navigation, then inject fresh ones
  document.querySelectorAll('script[data-seo-schema]').forEach(s => s.remove());
  [productSchema, breadcrumbSchema].forEach(schema => {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.setAttribute('data-seo-schema', '1');
    s.textContent = JSON.stringify(schema);
    document.head.appendChild(s);
  });
  // === END SEO + SCHEMA ===

  // Breadcrumb UI
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

  const isWholesale = product.wholesale_options && product.wholesale_options.length > 0;

  // Price
  const price = document.createElement('div');
  price.className = 'product-detail__price';
  if (isWholesale) {
    const minPrice = Math.min(...product.wholesale_options.map(o => o.price));
    const maxPrice = Math.max(...product.wholesale_options.map(o => o.price));
    price.textContent = `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`;
  } else {
    price.textContent = product.price > 0 ? formatPrice(product.price) : 'Contact for Price';
  }
  info.appendChild(price);

  // Description
  if (product.description) {
    const desc = document.createElement('p');
    desc.className = 'product-detail__desc';
    desc.textContent = safeText(product.description);
    info.appendChild(desc);
  }

  // Accordion
  info.appendChild(buildAccordion(product));

  let selectedOptionLabel = null;
  let selectedOptionPrice = null;

  if (isWholesale) {
    const optWrap = document.createElement('div');
    optWrap.style.cssText = 'margin-bottom:8px;';

    const optLabel = document.createElement('label');
    optLabel.textContent = 'Nº of Carts';
    optLabel.style.cssText = 'display:block; margin-bottom:8px; font-weight:700; color:var(--text); font-size:13px; letter-spacing:0.5px;';

    // Native select styled like the reference site — full-width white-bg box
    const selectWrap = document.createElement('div');
    selectWrap.style.cssText = 'position:relative;';

    const select = document.createElement('select');
    select.id = 'wholesale-select';
    select.style.cssText = [
      'width:100%',
      'font-family:inherit',
      'background:#ffffff',
      'color:#222',
      'border:1.5px solid #ccc',
      'padding:14px 16px',
      'border-radius:4px',
      'font-size:15px',
      'cursor:pointer',
      'outline:none',
      'appearance:auto',
      '-webkit-appearance:auto',
    ].join(';');

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'Choose an option';
    select.appendChild(defaultOpt);

    product.wholesale_options.forEach((opt, idx) => {
      const option = document.createElement('option');
      option.value = idx;
      option.textContent = opt.label;
      select.appendChild(option);
    });

    selectWrap.appendChild(select);
    optWrap.appendChild(optLabel);
    optWrap.appendChild(selectWrap);

    // Selected option display box (shown below select after choosing)
    const selectionBox = document.createElement('div');
    selectionBox.id = 'ws-selection-box';
    selectionBox.style.cssText = 'display:none; background:#fff; color:#222; border:1.5px solid #1a73e8; border-radius:4px; padding:12px 16px; margin-top:6px; font-size:15px; font-weight:500;';

    // CLEAR link
    const clearBtn = document.createElement('div');
    clearBtn.textContent = 'CLEAR';
    clearBtn.style.cssText = 'display:none; font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1.5px; cursor:pointer; margin-top:6px; text-decoration:underline;';

    // Dynamic price display
    const selectedPriceDisplay = document.createElement('div');
    selectedPriceDisplay.id = 'ws-price-display';
    selectedPriceDisplay.className = 'product-detail__price';
    selectedPriceDisplay.style.cssText = 'display:none; margin-top:20px; margin-bottom:8px;';

    select.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === '') {
        selectedOptionLabel = null;
        selectedOptionPrice = null;
        clearBtn.style.display = 'none';
        selectionBox.style.display = 'none';
        selectedPriceDisplay.style.display = 'none';
      } else {
        const opt = product.wholesale_options[parseInt(val)];
        selectedOptionLabel = opt.label;
        selectedOptionPrice = opt.price;
        selectionBox.textContent = opt.label;
        selectionBox.style.display = 'block';
        clearBtn.style.display = 'block';
        selectedPriceDisplay.textContent = formatPrice(opt.price);
        selectedPriceDisplay.style.display = 'block';
      }
    });

    clearBtn.addEventListener('click', () => {
      select.value = '';
      select.dispatchEvent(new Event('change'));
    });

    info.appendChild(optWrap);
    info.appendChild(selectionBox);
    info.appendChild(clearBtn);
    info.appendChild(selectedPriceDisplay);
  }


  // Row for Qty + Cart Button
  const actionRow = document.createElement('div');
  actionRow.style.cssText = 'display:flex; gap:16px; align-items:center; margin-bottom:24px;';

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
  
  actionRow.appendChild(qtyWrap);

  // Add to Cart button
  const cartBtn = document.createElement('button');
  cartBtn.className = 'btn-add-cart';
  cartBtn.type = 'button';
  cartBtn.textContent = product.in_stock ? 'Add to Cart' : 'Out of Stock';
  if (!product.in_stock) cartBtn.disabled = true;
  cartBtn.addEventListener('click', () => {
    if (isWholesale && !selectedOptionLabel) {
      showToast('Please select an option first', 'error');
      return;
    }
    addToCart({
      ...product,
      subgroupName: sg ? sg.name : ''
    }, qty, selectedOptionLabel, selectedOptionPrice);
  });
  actionRow.appendChild(cartBtn);
  info.appendChild(actionRow);

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

// =============================================
// ACCORDION UI
// =============================================
function buildAccordion(product) {
  const wrap = document.createElement('div');
  wrap.className = 'product-accordion';

  const items = [
    {
      title: 'Ingredients',
      contentHTML: product.ingredients ? `<p>${safeText(product.ingredients).replace(/\\n/g, '<br/>')}</p>` : '<p class="text-muted">No ingredients listed.</p>'
    },
    {
      title: 'Lab Results',
      contentHTML: product.lab_result_url 
        ? `<a href="${product.lab_result_url}" target="_blank" class="lab-result-link">View Official COA (PDF) →</a>` 
        : '<p class="text-muted">Test results pending or unavailable.</p>'
    },
    {
      title: 'Contact Us',
      contentHTML: '<p>Have questions about this product? <a href="mailto:contact@muhameddispo.com" class="text-gold">Email our team</a>.</p>'
    }
  ];

  items.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'accordion-item';

    const header = document.createElement('button');
    header.className = 'accordion-header';
    header.setAttribute('aria-expanded', 'false');
    
    const titleSpan = document.createElement('span');
    titleSpan.className = 'accordion-title';
    titleSpan.textContent = item.title;
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'accordion-icon';
    iconSpan.textContent = '+';

    header.appendChild(titleSpan);
    header.appendChild(iconSpan);

    const body = document.createElement('div');
    body.className = 'accordion-body';
    
    const bodyInner = document.createElement('div');
    bodyInner.className = 'accordion-inner';
    bodyInner.innerHTML = item.contentHTML;
    body.appendChild(bodyInner);

    header.addEventListener('click', () => {
      const isOpen = itemEl.classList.contains('active');
      
      // Close all others
      Array.from(wrap.children).forEach(child => {
        child.classList.remove('active');
        child.querySelector('.accordion-header').setAttribute('aria-expanded', 'false');
        child.querySelector('.accordion-icon').textContent = '+';
        child.querySelector('.accordion-body').style.maxHeight = null;
      });

      if (!isOpen) {
        itemEl.classList.add('active');
        header.setAttribute('aria-expanded', 'true');
        iconSpan.textContent = '−';
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });

    itemEl.appendChild(header);
    itemEl.appendChild(body);
    wrap.appendChild(itemEl);
  });

  return wrap;
}
