import express from 'express';
import mongoose from 'mongoose';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

await mongoose.connect('mongodb://127.0.0.1:27017/simple_ecommerce');

const ProductSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  imageUrl: String
});

const Product = mongoose.model('Product', ProductSchema);

// Serve frontend
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Simple E-commerce Store</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 1000px;
      margin: 30px auto;
      background: #f8f9fa;
      padding: 20px;
    }
    h1 {
      text-align: center;
      color: #2c3e50;
    }
    #add-product-form {
      margin-bottom: 30px;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 0 8px #ccc;
    }
    #add-product-form input, #add-product-form textarea {
      width: 100%;
      padding: 10px;
      margin-bottom: 10px;
      border-radius: 5px;
      border: 1px solid #ccc;
      font-size: 1rem;
    }
    #add-product-form button {
      padding: 10px 20px;
      background: #28a745;
      border: none;
      color: white;
      font-weight: bold;
      border-radius: 5px;
      cursor: pointer;
    }
    #products {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      justify-content: center;
    }
    .product-card {
      background: white;
      width: 220px;
      border-radius: 8px;
      box-shadow: 0 0 8px #ccc;
      padding: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .product-card img {
      max-width: 180px;
      max-height: 180px;
      object-fit: contain;
      border-radius: 6px;
      margin-bottom: 10px;
    }
    .product-card h3 {
      margin: 0 0 5px 0;
      color: #333;
      text-align: center;
    }
    .product-card p {
      font-size: 0.9rem;
      color: #555;
      text-align: center;
      min-height: 40px;
    }
    .product-card .price {
      margin: 10px 0;
      font-weight: bold;
      color: #e67e22;
      font-size: 1.2rem;
    }
    .product-card button {
      background: #007bff;
      border: none;
      color: white;
      padding: 8px 12px;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
    }
    #cart {
      margin-top: 30px;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 0 8px #ccc;
    }
    #cart h2 {
      margin-top: 0;
      color: #2c3e50;
    }
    #cart ul {
      list-style: none;
      padding: 0;
    }
    #cart li {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
      align-items: center;
    }
    #cart li:last-child {
      border-bottom: none;
    }
    #cart li button {
      background: #dc3545;
      border: none;
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
    }
    #checkout-btn {
      margin-top: 15px;
      background: #28a745;
      border: none;
      color: white;
      padding: 12px 20px;
      font-weight: bold;
      border-radius: 5px;
      cursor: pointer;
      width: 100%;
    }
    #message {
      text-align: center;
      margin-bottom: 15px;
      font-weight: bold;
      color: green;
    }
  </style>
</head>
<body>

<h1>Simple E-commerce Store</h1>

<div id="message"></div>

<section id="add-product-form">
  <h2>Add New Product (Admin)</h2>
  <form id="productForm">
    <input type="text" id="title" placeholder="Product Title" required />
    <textarea id="description" rows="3" placeholder="Product Description" required></textarea>
    <input type="number" id="price" placeholder="Price (USD)" min="0" step="0.01" required />
    <input type="url" id="imageUrl" placeholder="Image URL" required />
    <button type="submit">Add Product</button>
  </form>
</section>

<section>
  <h2>Products</h2>
  <div id="products"></div>
</section>

<section id="cart">
  <h2>Your Cart</h2>
  <ul id="cart-items"></ul>
  <p><strong>Total: $<span id="total-price">0.00</span></strong></p>
  <button id="checkout-btn">Checkout</button>
</section>

<script>
  let cart = [];

  const messageDiv = document.getElementById('message');
  const productsDiv = document.getElementById('products');
  const cartItemsUl = document.getElementById('cart-items');
  const totalPriceSpan = document.getElementById('total-price');

  function showMessage(msg, isError = false) {
    messageDiv.textContent = msg;
    messageDiv.style.color = isError ? 'red' : 'green';
    if(msg) setTimeout(() => messageDiv.textContent = '', 3000);
  }

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products');
      if(!res.ok) throw new Error('Failed to load products');
      const products = await res.json();
      renderProducts(products);
    } catch (e) {
      showMessage(e.message, true);
    }
  }

  function renderProducts(products) {
    productsDiv.innerHTML = '';
    if(products.length === 0) {
      productsDiv.innerHTML = '<p>No products available.</p>';
      return;
    }
    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = \`
        <img src="\${p.imageUrl}" alt="\${p.title}" />
        <h3>\${p.title}</h3>
        <p>\${p.description}</p>
        <div class="price">\${p.price.toFixed(2)} $</div>
        <button data-id="\${p._id}">Add to Cart</button>
      \`;
      card.querySelector('button').addEventListener('click', () => addToCart(p));
      productsDiv.appendChild(card);
    });
  }

  function addToCart(product) {
    const existing = cart.find(item => item.product._id === product._id);
    if(existing) {
      existing.qty++;
    } else {
      cart.push({ product, qty: 1 });
    }
    renderCart();
    showMessage('Added to cart');
  }

  function renderCart() {
    cartItemsUl.innerHTML = '';
    if(cart.length === 0) {
      cartItemsUl.innerHTML = '<li>Your cart is empty.</li>';
      totalPriceSpan.textContent = '0.00';
      return;
    }
    let total = 0;
    cart.forEach(({ product, qty }, i) => {
      total += product.price * qty;
      const li = document.createElement('li');
      li.innerHTML = \`
        <span>\${product.title} (x\${qty})</span>
        <span>
          \$\${(product.price * qty).toFixed(2)}
          <button data-index="\${i}">Remove</button>
        </span>
      \`;
      li.querySelector('button').addEventListener('click', () => {
        removeFromCart(i);
      });
      cartItemsUl.appendChild(li);
    });
    totalPriceSpan.textContent = total.toFixed(2);
  }

  function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
  }

  document.getElementById('checkout-btn').addEventListener('click', () => {
    if(cart.length === 0) {
      showMessage('Your cart is empty.', true);
      return;
    }
    alert('Checkout successful! Total: $' + totalPriceSpan.textContent);
    cart = [];
    renderCart();
  });

  // Add new product (admin simulation)
  document.getElementById('productForm').addEventListener('submit', async e => {
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const price = parseFloat(document.getElementById('price').value);
    const imageUrl = document.getElementById('imageUrl').value.trim();
    if(!title || !description || !price || !imageUrl) {
      showMessage('Please fill all product fields', true);
      return;
    }
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title, description, price, imageUrl })
      });
      if(!res.ok) throw new Error('Failed to add product');
      showMessage('Product added successfully');
      e.target.reset();
      fetchProducts();
    } catch(err) {
      showMessage(err.message, true);
    }
  });

  fetchProducts();
  renderCart();
</script>

</body>
</html>
  `);
});

// API routes

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch {
    res.status(500).json({ message: 'Failed to get products' });
  }
});

// Add new product
app.post('/api/products', async (req, res) => {
  try {
    const { title, description, price, imageUrl } = req.body;
    if(!title || !description || price == null || !imageUrl) {
      return res.status(400).json({ message: 'All fields required' });
    }
    const product = new Product({ title, description, price, imageUrl });
    await product.save();
    res.status(201).json(product);
  } catch {
    res.status(500).json({ message: 'Failed to add product' });
  }
});

app.listen(5000, () => {
  console.log('Simple E-commerce Store running at http://localhost:5000');
});
