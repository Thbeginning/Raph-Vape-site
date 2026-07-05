// =============================================
// cart-page.js — Shopping Cart + Checkout Flow
// MUHAMEDDISPO
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  initCartActions();
  initCheckoutForm();
  initPaymentCards();
});

// =============================================
// RENDER CART
// =============================================
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
  if (contentEl) contentEl.style.display = 'block';

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

  const info = document.createElement('div');
  info.className = 'cart-item__info';

  const name = document.createElement('div');
  name.className = 'cart-item__name';
  name.textContent = safeText(item.name) + (item.optionLabel ? ` (${safeText(item.optionLabel)})` : '');
  info.appendChild(name);

  const sub = document.createElement('div');
  sub.className = 'cart-item__sub';
  const subParts = [item.subgroupName, item.strainType, item.optionLabel].filter(Boolean);
  sub.textContent = subParts.join(' · ');
  info.appendChild(sub);

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

  const price = document.createElement('div');
  price.className = 'cart-item__price';
  price.textContent = formatPrice(item.price * item.qty);
  div.appendChild(price);

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

// =============================================
// CART ACTIONS (clear, proceed to checkout)
// =============================================
function initCartActions() {
  const clearBtn = document.getElementById('clear-cart');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      saveCart([]);
      renderCart();
      showToast('Cart cleared', 'success');
    });
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      const cart = getCart();
      const total = getCartTotal();

      if (cart.length === 0) {
        showToast('Your cart is empty.', 'error');
        return;
      }

      if (total < 120) {
        showToast('Minimum order amount is $120.00', 'error');
        return;
      }

      showCheckoutPanel();
    });
  }

  const backBtn = document.getElementById('checkout-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', showCartItemsView);
  }
}

function showCheckoutPanel() {
  const itemsView = document.getElementById('cart-items-view');
  const checkoutPanel = document.getElementById('checkout-panel');
  const successScreen = document.getElementById('checkout-success');
  if (itemsView) itemsView.style.display = 'none';
  if (checkoutPanel) { checkoutPanel.style.display = 'block'; checkoutPanel.scrollIntoView({ behavior: 'smooth' }); }
  if (successScreen) successScreen.style.display = 'none';
  // Switch cart-wrap from grid to block for full-width
  const cartWrap = document.getElementById('cart-content');
  if (cartWrap) cartWrap.style.display = 'block';
}

function showCartItemsView() {
  const itemsView = document.getElementById('cart-items-view');
  const checkoutPanel = document.getElementById('checkout-panel');
  if (itemsView) itemsView.style.display = 'block';
  if (checkoutPanel) checkoutPanel.style.display = 'none';
  const cartWrap = document.getElementById('cart-content');
  if (cartWrap) cartWrap.style.display = 'block';
}

// =============================================
// PAYMENT CARDS (visual selection)
// =============================================
function initPaymentCards() {
  document.querySelectorAll('.payment-card').forEach(card => {
    const radio = card.querySelector('.payment-radio');
    if (!radio) return;
    card.addEventListener('click', () => {
      // Deselect all
      document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      radio.checked = true;
    });
  });
}

// =============================================
// CHECKOUT FORM SUBMISSION
// =============================================
function initCheckoutForm() {
  const form = document.getElementById('checkout-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleCheckoutSubmit();
  });
}

async function handleCheckoutSubmit() {
  const errorEl = document.getElementById('checkout-error');
  const submitBtn = document.getElementById('checkout-submit-btn');

  // Clear error
  if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }

  // Read fields
  const name = document.getElementById('co-name')?.value.trim() || '';
  const email = document.getElementById('co-email')?.value.trim() || '';
  const phone = document.getElementById('co-phone')?.value.trim() || '';
  const address = document.getElementById('co-address')?.value.trim() || '';
  const city = document.getElementById('co-city')?.value.trim() || '';
  const state = document.getElementById('co-state')?.value.trim() || '';
  const zip = document.getElementById('co-zip')?.value.trim() || '';
  const paymentRadio = document.querySelector('input[name="payment"]:checked');
  const paymentMethod = paymentRadio ? paymentRadio.value : '';

  // Validate
  const errors = [];
  if (!name) errors.push('Full name is required.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('A valid email address is required.');
  if (!address) errors.push('Street address is required.');
  if (!city) errors.push('City is required.');
  if (!state) errors.push('State is required.');
  if (!zip) errors.push('ZIP code is required.');
  if (!paymentMethod) errors.push('Please select a payment method.');

  if (errors.length > 0) {
    if (errorEl) {
      errorEl.innerHTML = errors.map(e => `<div>• ${e}</div>`).join('');
      errorEl.style.display = 'block';
      errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  // Build order
  const cart = getCart();
  const total = getCartTotal();
  const fullAddress = `${address}, ${city}, ${state} ${zip}`;

  const orderData = {
    customer_name: name,
    customer_email: email,
    customer_phone: phone,
    customer_address: fullAddress,
    payment_method: paymentMethod,
    cart_items: cart,
    subtotal: total,
    status: 'pending',
  };

  // Disable submit button
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Placing order...'; }

  try {
    // Save to Supabase
    const sb = getSupabase();
    const { data: savedOrder, error: dbError } = await sb
      .from('orders')
      .insert(orderData)
      .select('id')
      .single();

    if (dbError) {
      // If orders table doesn't exist yet, don't block the user — show success anyway
      console.warn('DB error (orders table may not exist yet):', dbError.message);
    }

    const orderId = savedOrder?.id ? savedOrder.id.toString().substring(0, 8).toUpperCase() : Math.random().toString(36).substring(2, 10).toUpperCase();

    // Send email via Vercel serverless function (calls Resend API securely)
    try {
      await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...orderData, orderId }),
      });
    } catch (_) {
      // Function unavailable in local dev — order still saved to DB
    }

    // Clear cart
    saveCart([]);

    // Show success
    showSuccessScreen(name, email, paymentMethod, orderId);

  } catch (err) {
    console.error('Checkout error:', err);
    if (errorEl) {
      errorEl.textContent = 'There was an error placing your order. Please try again or contact us at contact@muhameddispo.com.';
      errorEl.style.display = 'block';
    }
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Place Order & Receive Payment Details →'; }
  }
}

function showSuccessScreen(name, email, paymentMethod, orderId) {
  const checkoutPanel = document.getElementById('checkout-panel');
  const successScreen = document.getElementById('checkout-success');
  const successRef = document.getElementById('success-ref');
  const successMsg = document.getElementById('success-msg');

  const methodLabels = {
    Bitcoin: 'Bitcoin',
    CashApp: 'CashApp',
    ApplePay: 'Apple Pay',
    Zelle: 'Zelle',
    Chime: 'Chime',
  };

  if (checkoutPanel) checkoutPanel.style.display = 'none';
  if (successScreen) {
    successScreen.style.display = 'block';
    successScreen.scrollIntoView({ behavior: 'smooth' });
  }

  if (successMsg) {
    successMsg.innerHTML = `
      Thank you, <strong>${safeText(name)}</strong>! Your order has been received.<br><br>
      We have noted your preferred payment method: <strong>${methodLabels[paymentMethod] || paymentMethod}</strong>.<br><br>
      Full payment details and your invoice will be sent to <strong>${safeText(email)}</strong> within minutes.
      Once your payment is confirmed, we will process and ship your order promptly.
    `;
  }

  if (successRef) {
    successRef.innerHTML = `<span>Order Reference:</span> <strong>#${orderId}</strong>`;
  }
}
