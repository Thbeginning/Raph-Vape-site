// =============================================
// cart-page.js — Shopping Cart Page
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  initCartActions();
});

function renderCart() {
  const cart = getCart();
  const itemsEl = document.getElementById('cart-items');
  const emptyEl = document.getElementById('cart-empty');
  const contentEl = document.getElementById('cart-content');

  if (!itemsEl) return;

  if (cart.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'grid';

  itemsEl.replaceChildren();
  cart.forEach(item => {
    const row = buildCartRow(item);
    itemsEl.appendChild(row);
  });

  updateSummary();
}

function buildCartRow(item) {
  const div = document.createElement('div');
  div.className = 'cart-item';
  div.setAttribute('role', 'listitem');
  div.dataset.id = item.id;

  // Image
  if (item.imageUrl) {
    const img = document.createElement('img');
    img.src = item.imageUrl;
    img.alt = item.name;
    img.className = 'cart-item__img';
    img.loading = 'lazy';
    div.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'cart-item__img';
    ph.style.cssText = 'background:rgba(197,179,111,0.05);display:flex;align-items:center;justify-content:center;font-size:24px;';
    ph.textContent = '🛒';
    div.appendChild(ph);
  }

  // Info
  const info = document.createElement('div');
  info.className = 'cart-item__info';

  const name = document.createElement('div');
  name.className = 'cart-item__name';
  name.textContent = safeText(item.name);
  info.appendChild(name);

  const sub = document.createElement('div');
  sub.className = 'cart-item__sub';
  const subParts = [item.subgroupName, item.strainType].filter(Boolean);
  sub.textContent = subParts.join(' · ');
  info.appendChild(sub);

  // Qty controls
  const qtyWrap = document.createElement('div');
  qtyWrap.className = 'qty-wrap';
  qtyWrap.style.marginTop = '10px';

  const minus = document.createElement('button');
  minus.className = 'qty-btn';
  minus.type = 'button';
  minus.textContent = '−';
  minus.setAttribute('aria-label', 'Decrease quantity of ' + item.name);
  minus.addEventListener('click', () => {
    const newQty = Math.max(1, item.qty - 1);
    updateCartQty(item.id, newQty);
    renderCart();
  });

  const qtyNum = document.createElement('span');
  qtyNum.className = 'qty-val';
  qtyNum.style.fontSize = '14px';
  qtyNum.textContent = String(item.qty);
  qtyNum.setAttribute('aria-label', 'Quantity: ' + item.qty);

  const plus = document.createElement('button');
  plus.className = 'qty-btn';
  plus.type = 'button';
  plus.textContent = '+';
  plus.setAttribute('aria-label', 'Increase quantity of ' + item.name);
  plus.addEventListener('click', () => {
    const newQty = Math.min(99, item.qty + 1);
    updateCartQty(item.id, newQty);
    renderCart();
  });

  qtyWrap.appendChild(minus);
  qtyWrap.appendChild(qtyNum);
  qtyWrap.appendChild(plus);
  info.appendChild(qtyWrap);
  div.appendChild(info);

  // Price
  const price = document.createElement('div');
  price.className = 'cart-item__price';
  price.textContent = formatPrice(item.price * item.qty);
  div.appendChild(price);

  // Remove
  const removeBtn = document.createElement('button');
  removeBtn.className = 'cart-item__remove';
  removeBtn.type = 'button';
  removeBtn.textContent = '✕';
  removeBtn.setAttribute('aria-label', 'Remove ' + item.name + ' from cart');
  removeBtn.addEventListener('click', () => {
    removeFromCart(item.id);
    renderCart();
    showToast('Removed from cart', 'success');
  });
  div.appendChild(removeBtn);

  return div;
}

function updateSummary() {
  const cart = getCart();
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = getCartTotal();

  const countEl = document.getElementById('summary-count');
  const subtotalEl = document.getElementById('summary-subtotal');
  const totalEl = document.getElementById('summary-total');

  if (countEl) countEl.textContent = count;
  if (subtotalEl) subtotalEl.textContent = formatPrice(total);
  if (totalEl) totalEl.textContent = formatPrice(total);
}

function initCartActions() {
  // Clear cart button
  const clearBtn = document.getElementById('clear-cart');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      saveCart([]);
      renderCart();
      showToast('Cart cleared', 'success');
    });
  }

  // Checkout button (placeholder — wire to Stripe later)
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      const cart = getCart();
      if (cart.length === 0) {
        showToast('Your cart is empty.', 'error');
        return;
      }
      // TODO: Integrate Stripe Checkout or custom checkout flow
      showToast('Checkout coming soon! Contact us to complete your order.', 'success');
    });
  }
}
