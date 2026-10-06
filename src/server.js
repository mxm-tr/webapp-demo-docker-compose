const path = require('node:path');
const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3000);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/tasty_crousty',
});

const menu = [
  {
    id: 'classic-crousty',
    name: 'The Classic Crousty',
    description: 'Golden chicken, herby rice, our signature creamy sauce.',
    priceCents: 1290,
    category: 'Crousty boxes',
    imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=900&q=85',
    isPopular: true,
  },
  {
    id: 'hot-honey',
    name: 'Hot Honey Crunch',
    description: 'Crispy chicken, hot honey glaze, slaw, pickles.',
    priceCents: 1450,
    category: 'Crousty boxes',
    imageUrl: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=900&q=85',
    isPopular: false,
  },
  {
    id: 'crunch-wrap',
    name: 'The Crunch Wrap',
    description: 'Buttermilk chicken wrapped up with crisp greens.',
    priceCents: 1190,
    category: 'Handhelds',
    imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=900&q=85',
    isPopular: false,
  },
  {
    id: 'tenders',
    name: 'Tenders & Dip',
    description: 'Three juicy tenders with a dip of your choice.',
    priceCents: 890,
    category: 'Sides & extras',
    imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=900&q=85',
    isPopular: true,
  },
  {
    id: 'loaded-fries',
    name: 'Loaded Crispy Fries',
    description: 'Skin-on fries, house sauce, chives, a little crunch.',
    priceCents: 650,
    category: 'Sides & extras',
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=85',
    isPopular: false,
  },
  {
    id: 'lemonade',
    name: 'Fresh Lemonade',
    description: 'Fresh-squeezed lemons, a hint of mint, lots of ice.',
    priceCents: 390,
    category: 'Sips',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765edfd7?auto=format&fit=crop&w=900&q=85',
    isPopular: false,
  },
];

const categories = [...new Set(menu.map((item) => item.category))];

app.use(express.json({ limit: '32kb' }));

app.get('/api/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch {
    response.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.get('/api/menu', (_request, response) => {
  response.json({ categories, items: menu });
});

app.post('/api/orders', async (request, response) => {
  const { customerName, note = '', items } = request.body || {};
  const name = typeof customerName === 'string' ? customerName.trim() : '';
  const orderNote = typeof note === 'string' ? note.trim() : '';

  if (name.length < 2 || name.length > 80) {
    return response.status(400).json({ error: 'Please enter a name between 2 and 80 characters.' });
  }
  if (orderNote.length > 300) {
    return response.status(400).json({ error: 'The order note must be 300 characters or fewer.' });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > menu.length) {
    return response.status(400).json({ error: 'Add at least one menu item to your order.' });
  }

  const quantities = new Map();
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      return response.status(400).json({ error: 'Each item needs a valid quantity between 1 and 20.' });
    }
    if (quantities.has(item.id)) {
      return response.status(400).json({ error: 'Each menu item can only appear once in an order.' });
    }
    quantities.set(item.id, item.quantity);
  }

  const selected = menu.filter((item) => quantities.has(item.id));
  if (selected.length !== quantities.size) {
    return response.status(400).json({ error: 'One or more menu items are no longer available.' });
  }

  const orderItems = selected.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: quantities.get(item.id),
    priceCents: item.priceCents,
  }));
  const totalCents = orderItems.reduce((total, item) => total + item.priceCents * item.quantity, 0);

  try {
    const result = await pool.query(
      `INSERT INTO orders (customer_name, note, items, total_cents)
       VALUES ($1, $2, $3, $4)
       RETURNING id, customer_name AS "customerName", note, items, total_cents AS "totalCents", created_at AS "createdAt"`,
      [name, orderNote, JSON.stringify(orderItems), totalCents],
    );
    return response.status(201).json({ order: result.rows[0] });
  } catch (error) {
    console.error('Unable to save order:', error.message);
    return response.status(500).json({ error: 'Your order could not be saved. Please try again.' });
  }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

async function start() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id BIGSERIAL PRIMARY KEY,
          customer_name VARCHAR(80) NOT NULL,
          note VARCHAR(300) NOT NULL DEFAULT '',
          items JSONB NOT NULL,
          total_cents INTEGER NOT NULL CHECK (total_cents > 0),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      app.listen(port, '0.0.0.0', () => {
        console.log(`Tasty Crousty is running on port ${port}`);
      });
      return;
    } catch (error) {
      if (attempt === 30) throw error;
      console.log(`Waiting for PostgreSQL (${attempt}/30)...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

start().catch((error) => {
  console.error('Could not start the app:', error.message);
  process.exit(1);
});