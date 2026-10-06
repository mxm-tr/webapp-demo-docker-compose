const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const tabsElement = document.querySelector('#category-tabs');
const gridElement = document.querySelector('#menu-grid');
const cartElement = document.querySelector('#cart-items');
const countElement = document.querySelector('#cart-count');
const totalElement = document.querySelector('#cart-total');
const checkoutButton = document.querySelector('#checkout-button');
const checkoutForm = document.querySelector('#checkout-form');
const checkoutMessage = document.querySelector('#checkout-message');
const toast = document.querySelector('#toast');

let menuItems = [];
let activeCategory = 'All';
const cart = new Map();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function renderTabs(categories) {
  const allCategories = ['All', ...categories];
  tabsElement.innerHTML = allCategories.map((category) => `
    <button class="category-tab" type="button" role="tab" aria-selected="${category === activeCategory}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>
  `).join('');
}

function renderMenu() {
  const visibleItems = activeCategory === 'All'
    ? menuItems
    : menuItems.filter((item) => item.category === activeCategory);

  gridElement.innerHTML = visibleItems.map((item) => `
    <article class="menu-card">
      <div class="menu-card-image">
        <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy">
        ${item.isPopular ? '<span class="popular-tag">CROWD FAVOURITE</span>' : ''}
      </div>
      <div class="menu-card-body">
        <div class="menu-card-top"><h3>${escapeHtml(item.name)}</h3><span class="menu-card-price">${currency.format(item.priceCents / 100)}</span></div>
        <p class="menu-card-description">${escapeHtml(item.description)}</p>
        <button class="add-button" type="button" data-add="${escapeHtml(item.id)}" aria-label="Add ${escapeHtml(item.name)} to your order">Add to order <span aria-hidden="true">+</span></button>
      </div>
    </article>
  `).join('');
}

function renderCart() {
  const lines = [...cart.entries()];
  const count = lines.reduce((sum, [, quantity]) => sum + quantity, 0);
  const total = lines.reduce((sum, [id, quantity]) => {
    const item = menuItems.find((menuItem) => menuItem.id === id);
    return sum + item.priceCents * quantity;
  }, 0);

  countElement.textContent = String(count);
  countElement.setAttribute('aria-label', `${count} ${count === 1 ? 'item' : 'items'}`);
  totalElement.textContent = currency.format(total / 100);
  checkoutButton.disabled = count === 0;

  if (lines.length === 0) {
    cartElement.innerHTML = '<p class="empty-cart">Your next great meal starts here.</p>';
    return;
  }

  cartElement.innerHTML = lines.map(([id, quantity]) => {
    const item = menuItems.find((menuItem) => menuItem.id === id);
    return `
      <div class="cart-row">
        <span class="cart-row-name">${escapeHtml(item.name)}</span>
        <span class="cart-row-price">${currency.format(item.priceCents * quantity / 100)}</span>
        <div class="quantity-control" aria-label="Quantity for ${escapeHtml(item.name)}">
          <button type="button" data-change="${escapeHtml(id)}" data-delta="-1" aria-label="Remove one ${escapeHtml(item.name)}">-</button>
          <span>${quantity}</span>
          <button type="button" data-change="${escapeHtml(id)}" data-delta="1" aria-label="Add one ${escapeHtml(item.name)}">+</button>
        </div>
      </div>
    `;
  }).join('');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  window.setTimeout(() => toast.classList.remove('visible'), 3200);
}

tabsElement.addEventListener('click', (event) => {
  const tab = event.target.closest('[data-category]');
  if (!tab) return;
  activeCategory = tab.dataset.category;
  renderTabs([...new Set(menuItems.map((item) => item.category))]);
  renderMenu();
});

gridElement.addEventListener('click', (event) => {
  const button = event.target.closest('[data-add]');
  if (!button) return;
  const id = button.dataset.add;
  cart.set(id, (cart.get(id) || 0) + 1);
  renderCart();
  checkoutMessage.textContent = '';
  checkoutMessage.classList.remove('error');
  showToast('Added to your order. Nice choice.');
});

cartElement.addEventListener('click', (event) => {
  const button = event.target.closest('[data-change]');
  if (!button) return;
  const id = button.dataset.change;
  const nextQuantity = (cart.get(id) || 0) + Number(button.dataset.delta);
  if (nextQuantity <= 0) cart.delete(id);
  else if (nextQuantity <= 20) cart.set(id, nextQuantity);
  renderCart();
});

checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  checkoutButton.disabled = true;
  checkoutButton.firstChild.textContent = 'Sending your order... ';
  checkoutMessage.textContent = '';
  checkoutMessage.classList.remove('error');

  try {
    const formData = new FormData(checkoutForm);
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: formData.get('customerName'),
        note: formData.get('note'),
        items: [...cart.entries()].map(([id, quantity]) => ({ id, quantity })),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Could not place your order.');

    cart.clear();
    renderCart();
    checkoutForm.reset();
    checkoutMessage.textContent = `Order #${payload.order.id} is in. We'll have it ready in about 15 minutes.`;
    showToast(`Order #${payload.order.id} placed. See you soon!`);
  } catch (error) {
    checkoutMessage.textContent = error.message;
    checkoutMessage.classList.add('error');
    checkoutButton.disabled = cart.size === 0;
  } finally {
    checkoutButton.firstChild.textContent = 'Place pickup order ';
  }
});

async function loadMenu() {
  try {
    const response = await fetch('/api/menu');
    if (!response.ok) throw new Error('Menu is unavailable right now. Please refresh to try again.');
    const payload = await response.json();
    menuItems = payload.items;
    renderTabs(payload.categories);
    renderMenu();
    renderCart();
  } catch (error) {
    gridElement.innerHTML = `<p class="loading-state">${escapeHtml(error.message)}</p>`;
  }
}

loadMenu();