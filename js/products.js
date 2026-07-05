// =============================================
// products.js — Products Category Page
// =============================================

document.addEventListener('DOMContentLoaded', async () => {
  const groupSlug = getUrlParam('group');
  if (!groupSlug) {
    window.location.href = 'index.html';
    return;
  }
  await loadProductsPage(groupSlug);
});

async function loadProductsPage(slug) {
  try {
    let group;
    let isWholesalePage = false;
    
    try {
      group = await fetchGroup(slug);
    } catch (e) {
      if (slug === 'wholesale') {
        group = { id: 'wholesale', name: 'Wholesale', slug: 'wholesale', description: 'Bulk orders and wholesale pricing.', hero_image_url: '' };
      } else {
        throw e; // Reraise if not wholesale
      }
    }

    if (slug === 'wholesale' || group.name.toLowerCase() === 'wholesale') {
      isWholesalePage = true;
    }
    
    renderCategoryHero(group);
    document.title = group.name + ' · MUHAMEDDISPO';
    const metaDesc = document.getElementById('page-desc');
    if (metaDesc) metaDesc.setAttribute('content', group.description || '');

    const container = document.getElementById('subgroups-container');
    container.replaceChildren();

    if (isWholesalePage) {
      // Fetch all wholesale products and any products explicitly assigned to this group
      const sb = getSupabase();
      const { data: products } = await sb.from('products').select('*').order('sort_order');
      
      const wholesaleProducts = products.filter(p =>
        (p.wholesale_options && p.wholesale_options.length > 0) ||
        p.group_id === group.id ||
        (p.price === 0 && p.subgroup_id === null && p.group_id === null)
      );
      
      const mockSubgroup = { slug: group.slug, name: group.name, description: group.description };
      const section = buildSubgroupSection(mockSubgroup, wholesaleProducts, group.name, 0);
      container.appendChild(section);
      return;
    }

    const subgroups = await fetchSubgroups(group.id);

    if (subgroups.length === 0) {
      const products = await fetchProductsByGroup(group.id);
      const mockSubgroup = { slug: group.slug, name: group.name, description: group.description };
      const section = buildSubgroupSection(mockSubgroup, products, group.name, 0);
      container.appendChild(section);
    } else {
      for (let i = 0; i < subgroups.length; i++) {
        const sg = subgroups[i];
        const products = await fetchProductsBySubgroup(sg.id);
        const section = buildSubgroupSection(sg, products, group.name, i);
        container.appendChild(section);
      }
    }
  } catch (err) {
    console.error('Failed to load products page');
    const container = document.getElementById('subgroups-container');
    const msg = document.createElement('p');
    msg.textContent = 'Unable to load products. Please try again later.';
    msg.style.cssText = 'padding:80px 40px;color:var(--text-muted);text-align:center;';
    container.replaceChildren(msg);
  }
}

// =============================================
// Category Hero
// =============================================
function renderCategoryHero(group) {
  const textEl = document.getElementById('cat-hero-text');
  const mediaEl = document.getElementById('cat-hero-media');
  if (!textEl || !mediaEl) return;

  // Build text content safely
  textEl.replaceChildren();

  const eyebrow = document.createElement('div');
  eyebrow.className = 'section-label';
  eyebrow.textContent = 'MUHAMEDDISPO Products';
  textEl.appendChild(eyebrow);

  const title = document.createElement('h1');
  title.className = 'cat-hero__title';
  title.textContent = group.name + '.';
  textEl.appendChild(title);

  const tagline = document.createElement('div');
  tagline.className = 'cat-hero__tagline';
  tagline.textContent = group.tagline || '';
  textEl.appendChild(tagline);

  const desc = document.createElement('p');
  desc.className = 'cat-hero__desc';
  desc.textContent = group.description || '';
  textEl.appendChild(desc);

  // Build media safely
  mediaEl.replaceChildren();

  const glow = document.createElement('div');
  glow.className = 'cat-hero__glow';
  mediaEl.appendChild(glow);

  if (group.video_url) {
    const vid = document.createElement('video');
    vid.src = group.video_url;
    vid.autoplay = true;
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.setAttribute('aria-label', group.name + ' product video');
    vid.style.cssText = 'width:100%;border-radius:16px;filter:drop-shadow(0 24px 48px rgba(0,0,0,0.7));';
    mediaEl.appendChild(vid);
  } else if (group.hero_image_url) {
    const img = document.createElement('img');
    img.src = group.hero_image_url;
    img.alt = group.name;
    img.style.cssText = 'width:100%;border-radius:16px;filter:drop-shadow(0 24px 48px rgba(0,0,0,0.7));';
    mediaEl.appendChild(img);
  }
}

// =============================================
// Build Subgroup Section
// =============================================
function buildSubgroupSection(subgroup, products, groupName, index) {
  const section = document.createElement('section');
  section.className = 'subgroup-section';
  section.id = 'sg-' + subgroup.slug;

  // Header
  const header = document.createElement('div');
  header.className = 'subgroup-header';

  const left = document.createElement('div');
  left.className = 'subgroup-header__left';

  const lbl = document.createElement('div');
  lbl.className = 'subgroup-label';
  lbl.textContent = groupName;
  left.appendChild(lbl);

  const title = document.createElement('h2');
  title.className = 'subgroup-title';
  title.textContent = subgroup.name;
  left.appendChild(title);

  if (subgroup.description) {
    const desc = document.createElement('div');
    desc.className = 'subgroup-desc';
    desc.textContent = subgroup.description;
    left.appendChild(desc);
  }
  header.appendChild(left);

  // Arrow buttons
  const arrowWrap = document.createElement('div');
  arrowWrap.className = 'subgroup-arrows';

  const prevId = 'rail-prev-' + index;
  const nextId = 'rail-next-' + index;
  const railId = 'rail-' + index;

  const prevBtn = buildArrowBtn(prevId, 'Previous', true);
  const nextBtn = buildArrowBtn(nextId, 'Next', false);
  arrowWrap.appendChild(prevBtn);
  arrowWrap.appendChild(nextBtn);
  header.appendChild(arrowWrap);
  section.appendChild(header);

  // Gold divider
  const divider = document.createElement('div');
  divider.className = 'gold-divider';
  divider.setAttribute('aria-hidden', 'true');
  divider.style.cssText = 'margin: 0 40px 0;max-width:1200px;';
  section.appendChild(divider);

  // Rail
  const railWrap = document.createElement('div');
  railWrap.className = 'product-rail-wrap';

  const rail = document.createElement('div');
  rail.className = 'product-rail';
  rail.id = railId;
  rail.setAttribute('role', 'list');

  if (products.length === 0) {
    const msg = document.createElement('p');
    msg.textContent = 'No products in this category yet.';
    msg.style.cssText = 'color:var(--text-muted);padding:20px 0;';
    rail.appendChild(msg);
  } else {
    products.forEach(product => {
      const card = buildProductCard(product, subgroup.name);
      rail.appendChild(card);
    });
  }

  railWrap.appendChild(rail);
  section.appendChild(railWrap);

  // Init arrows after DOM insertion (use timeout to allow layout)
  setTimeout(() => {
    initRailButtons(railId, prevId, nextId, 256);
  }, 50);

  return section;
}

// =============================================
// Arrow Button SVG (built via DOM — no innerHTML)
// =============================================
function buildArrowBtn(id, label, isLeft) {
  const btn = document.createElement('button');
  btn.id = id;
  btn.className = 'arrow-btn';
  btn.setAttribute('aria-label', label);
  btn.type = 'button';

  // Build SVG safely
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '72');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 72 20');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  if (isLeft) svg.style.transform = 'scaleX(-1)';

  const opacities = [0.15, 0.4, 1.0];
  const xPositions = [[14,22,14],[30,38,30],[46,54,46]];
  opacities.forEach((op, i) => {
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    const [x1, x2, x3] = xPositions[i];
    poly.setAttribute('points', `${x1},4 ${x2},10 ${x3},16`);
    poly.setAttribute('stroke', '#c5b36f');
    poly.setAttribute('stroke-width', '1.6');
    poly.setAttribute('fill', 'none');
    poly.setAttribute('opacity', String(op));
    poly.setAttribute('stroke-linecap', 'round');
    poly.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(poly);
  });

  btn.appendChild(svg);
  return btn;
}

// =============================================
// Product Card
// =============================================
function buildProductCard(product, subgroupName) {
  const a = document.createElement('a');
  a.href = 'product-detail.html?id=' + encodeURIComponent(product.id);
  a.className = 'product-card';
  a.setAttribute('role', 'listitem');
  a.setAttribute('aria-label', product.name + ', ' + formatPrice(product.price));

  // Image wrap
  const imgWrap = document.createElement('div');
  imgWrap.className = 'product-card__img-wrap';

  if (product.image_url) {
    const img = document.createElement('img');
    img.src = product.image_url;
    img.alt = product.name;
    img.className = 'product-card__img';
    img.loading = 'lazy';
    imgWrap.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.style.cssText = 'width:80px;height:140px;background:rgba(197,179,111,0.1);border-radius:8px;';
    imgWrap.appendChild(ph);
  }
  a.appendChild(imgWrap);

  // Divider line
  const divider = document.createElement('div');
  divider.className = 'product-card__divider';
  a.appendChild(divider);

  // Body
  const body = document.createElement('div');
  body.className = 'product-card__body';

  const name = document.createElement('div');
  name.className = 'product-card__name';
  name.textContent = safeText(product.name);
  body.appendChild(name);

  // Badges
  const badges = document.createElement('div');
  badges.className = 'product-card__badges';

  const sgBadge = document.createElement('span');
  sgBadge.className = 'badge ' + getSubgroupBadgeClass(subgroupName);
  sgBadge.textContent = subgroupName;
  badges.appendChild(sgBadge);

  if (product.strain_type) {
    const strainBadge = document.createElement('span');
    strainBadge.className = 'badge badge-' + safeText(product.strain_type).toLowerCase();
    strainBadge.textContent = product.strain_type;
    badges.appendChild(strainBadge);
  }
  body.appendChild(badges);

  const isWholesale = product.wholesale_options && product.wholesale_options.length > 0;

  // Price
  const price = document.createElement('div');
  price.className = 'product-card__price';
  if (isWholesale) {
    const minPrice = Math.min(...product.wholesale_options.map(o => o.price));
    const maxPrice = Math.max(...product.wholesale_options.map(o => o.price));
    price.textContent = `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`;
  } else {
    price.textContent = product.price > 0 ? formatPrice(product.price) : 'Contact for Price';
  }
  body.appendChild(price);

  // Add to cart button (shown on hover via CSS)
  const cartBtn = document.createElement('button');
  cartBtn.className = 'product-card__cart-btn';
  cartBtn.type = 'button';
  
  if (isWholesale) {
    cartBtn.textContent = 'Select Options';
    cartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = a.href;
    });
  } else {
    cartBtn.textContent = 'Add to Cart';
    cartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      addToCart({ ...product, subgroupName });
    });
  }
  body.appendChild(cartBtn);

  a.appendChild(body);
  return a;
}

function getSubgroupBadgeClass(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('melted')) return 'badge-melted';
  if (n.includes('live')) return 'badge-live';
  if (n.includes('rosin')) return 'badge-rosin';
  if (n.includes('distillate')) return 'badge-distillate';
  return 'badge-subgroup';
}
