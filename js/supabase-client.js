// =============================================
// Supabase Client Initialisation
// MUHAMEDDISPO — Luxury Vape Site
// =============================================
// TODO(security): Anon key is safe to expose client-side — RLS policies
// enforce read-only public access. Service role key is NEVER used here.

const SUPABASE_URL = 'https://fujlhixdfdltretlplxl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1amxoaXhkZmRsdHJldGxwbHhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM2MTgsImV4cCI6MjA5ODM5OTYxOH0._u49XADcXRlyeLq04FM0EKdLaP0UyqkvKvxZx6sTkuQ';

// Supabase JS client loaded via CDN script in each HTML file
// Access via: window._supabase
function getSupabase() {
  if (!window._supabase) {
    window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  }
  return window._supabase;
}

// =============================================
// API Helpers
// =============================================

async function fetchGroups() {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('product_groups')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data;
}

async function fetchGroup(slug) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('product_groups')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

async function fetchSubgroups(groupId) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('product_subgroups')
    .select('*')
    .eq('group_id', groupId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

async function fetchProductsByGroup(groupId) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('group_id', groupId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

async function fetchProductsBySubgroup(subgroupId) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('subgroup_id', subgroupId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

async function fetchProduct(id) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('products')
    .select(`*, product_subgroups(name, slug, product_groups(name, slug)), product_groups(name, slug)`)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function fetchProductBySlug(subgroupId, slug) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('products')
    .select(`*, product_subgroups(name, slug, group_id, product_groups(name, slug))`)
    .eq('subgroup_id', subgroupId)
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

// =============================================
// Cart (localStorage)
// TODO(security): Cart contains no PII, localStorage is appropriate here.
// =============================================
const CART_KEY = 'muhamed_cart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  // Validate cart before saving — ensure no injected properties
  const clean = cart.map(item => ({
    id: String(item.id).substring(0, 100), // increased length for option suffix
    productId: String(item.productId || item.id).substring(0, 64),
    name: String(item.name).substring(0, 200),
    subgroupName: String(item.subgroupName || '').substring(0, 100),
    strainType: String(item.strainType || '').substring(0, 20),
    price: parseFloat(item.price) || 0,
    imageUrl: String(item.imageUrl || '').substring(0, 500),
    qty: Math.max(1, parseInt(item.qty) || 1),
    optionLabel: String(item.optionLabel || '').substring(0, 100),
  }));
  localStorage.setItem(CART_KEY, JSON.stringify(clean));
  updateCartBadge();
}

function addToCart(product, qty = 1, optionLabel = null, optionPrice = null) {
  const cart = getCart();
  const cartId = optionLabel ? `${product.id}-${slugify(optionLabel)}` : product.id;
  const existing = cart.find(i => i.id === cartId);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, 99);
  } else {
    cart.push({
      id: cartId,
      productId: product.id,
      name: product.name,
      subgroupName: product.subgroupName || '',
      strainType: product.strain_type || '',
      price: optionPrice !== null ? parseFloat(optionPrice) : (parseFloat(product.price) || 0),
      imageUrl: product.image_url || '',
      qty: Math.min(qty, 99),
      optionLabel: optionLabel || '',
    });
  }
  saveCart(cart);
  showToast('Added to cart ✓', 'success');
}

function removeFromCart(productId) {
  const cart = getCart().filter(i => i.id !== productId);
  saveCart(cart);
}

function updateCartQty(productId, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) {
    item.qty = Math.max(1, Math.min(parseInt(qty) || 1, 99));
    saveCart(cart);
  }
}

function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function getCartTotal() {
  return getCart().reduce((sum, i) => sum + i.price * i.qty, 0);
}

function updateCartBadge() {
  const count = getCartCount();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = count;
    el.classList.toggle('visible', count > 0);
  });
}

// =============================================
// Toast Notification
// =============================================
let toastTimer = null;
function showToast(msg, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  const icon = document.createElement('span');
  icon.className = 'toast__icon';
  icon.textContent = type === 'success' ? '✓' : '✕';
  const text = document.createElement('span');
  text.textContent = msg; // textContent is safe — no XSS risk
  toast.replaceChildren(icon, text);
  toast.className = `toast ${type}`;
  // Force reflow then show
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// =============================================
// Age Gate
// =============================================
function initAgeGate() {
  const passed = sessionStorage.getItem('age_verified');
  const gate = document.getElementById('age-gate');
  if (!gate) return;
  if (passed === '1') { 
    gate.remove(); 
    return; 
  }
  
  // Lock scrolling while age gate is active
  document.body.style.overflow = 'hidden';
  
  const yes = document.getElementById('age-yes');
  const no = document.getElementById('age-no');
  
  if (yes) yes.addEventListener('click', () => {
    sessionStorage.setItem('age_verified', '1');
    gate.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    gate.style.opacity = '0';
    gate.style.transform = 'scale(1.05)';
    setTimeout(() => {
      document.body.style.overflow = ''; // Unlock scrolling
      gate.remove();
    }, 500);
  });
  
  if (no) no.addEventListener('click', () => {
    window.location.href = 'https://www.google.com';
  });
}

// =============================================
// Navbar
// =============================================
async function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  // Scroll effect
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  // Hamburger
  const hamburger = document.getElementById('nav-hamburger');
  const drawer = document.getElementById('nav-drawer');
  const drawerClose = document.getElementById('drawer-close');
  if (hamburger && drawer) {
    hamburger.addEventListener('click', () => drawer.classList.toggle('open'));
    if (drawerClose) drawerClose.addEventListener('click', () => drawer.classList.remove('open'));
    drawer.addEventListener('click', e => { 
      // Close on clicking outside or clicking a regular link (excluding dropdown toggles)
      if (e.target === drawer || (e.target.tagName === 'A' && !e.target.hasAttribute('data-dropdown-toggle'))) {
        drawer.classList.remove('open'); 
      }
    });
  }

  // Fetch groups dynamically and populate menus
  try {
    const groups = await fetchGroups();
    const desktopDropdown = document.getElementById('nav-dropdown');
    const mobileDropdown = document.getElementById('drawer-dropdown');
    
    if (groups && groups.length > 0) {
      let htmlLinks = groups.map(g => `<a href="products.html?group=${encodeURIComponent(g.slug)}" role="menuitem">${safeText(g.name)}</a>`).join('');
      htmlLinks += `<a href="products.html?group=wholesale" role="menuitem">Wholesale</a>`;
      if (desktopDropdown) desktopDropdown.innerHTML = htmlLinks;
      if (mobileDropdown) mobileDropdown.innerHTML = htmlLinks;
    }
  } catch (err) {
    console.error('Failed to load navigation groups:', err);
  }

  // Desktop Products dropdown
  const productsBtn = document.getElementById('nav-products-btn');
  const dropdown = document.getElementById('nav-dropdown');
  if (productsBtn && dropdown) {
    productsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => dropdown.classList.remove('open'));
  }

  // Mobile Products dropdown
  const drawerProductsBtn = document.getElementById('drawer-products-btn');
  const drawerDropdown = document.getElementById('drawer-dropdown');
  if (drawerProductsBtn && drawerDropdown) {
    drawerProductsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = drawerProductsBtn.getAttribute('aria-expanded') === 'true';
      drawerProductsBtn.setAttribute('aria-expanded', !isOpen);
      drawerDropdown.classList.toggle('open');
    });
  }

  // Mark active link
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a, .nav-drawer a').forEach(a => {
    if (a.getAttribute('href') === path || (path.includes('products') && a.getAttribute('href') && a.getAttribute('href').includes('products'))) {
      a.classList.add('active');
    }
  });

  updateCartBadge();
}

// =============================================
// Utility
// =============================================
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatPrice(num) {
  return '$' + parseFloat(num).toFixed(2);
}

function safeText(str) {
  // Returns safe text content — use with textContent only, never innerHTML
  return String(str || '').substring(0, 2000);
}

function getUrlParam(key) {
  const params = new URLSearchParams(window.location.search);
  // Validate/sanitize the param
  const val = params.get(key);
  if (!val) return null;
  return val.substring(0, 200).replace(/[<>"'`]/g, '');
}

// =============================================
// Scroll Rail Helper
// =============================================
function initRailButtons(railId, prevId, nextId, cardWidth = 256) {
  const rail = document.getElementById(railId);
  const prev = document.getElementById(prevId);
  const next = document.getElementById(nextId);
  if (!rail || !prev || !next) return;

  const scroll = (dir) => {
    rail.scrollBy({ left: dir * cardWidth * 2, behavior: 'smooth' });
  };
  prev.addEventListener('click', () => scroll(-1));
  next.addEventListener('click', () => scroll(1));

  const update = () => {
    prev.disabled = rail.scrollLeft <= 0;
    next.disabled = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 4;
  };
  rail.addEventListener('scroll', update, { passive: true });
  update();
}

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initAgeGate();
  initNavbar();
});
