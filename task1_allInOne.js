import express from 'express';
import mongoose from 'mongoose';

const app = express();
app.use(express.json());

await mongoose.connect('mongodb://127.0.0.1:27017/ecommerce');

const Product = mongoose.model('Product', new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true }
}));

// Serve single-page frontend with inline CSS & JS
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Big E-commerce Store</title>
<style>
  body {
    font-family: Arial, sans-serif;
    background: #eef2f3;
    padding: 20px;
    max-width: 900px;
    margin: auto;
  }
  h1 {
    text-align: center;
    color: #333;
  }
  form {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    justify-content: center;
  }
  form input {
    padding: 10px;
    font-size: 1rem;
    flex: 1 1 200px;
  }
  form button {
    padding: 10px 20px;
    font-size: 1rem;
    cursor: pointer;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    flex: 0 0 auto;
  }
  #message {
    text-align: center;
    margin-bottom: 15px;
    color: red;
  }
  #products {
    display: grid;
    grid-template-columns: repeat(auto-fill,minmax(250px,1fr));
    gap: 20px;
  }
  .product {
    background: white;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 0 6px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .product img {
    max-width: 100%;
    height: 160px;
    object-fit: contain;
    margin-bottom: 10px;
    border-radius: 6px;
  }
  .product h3 {
    margin: 0 0 5px;
    font-size: 1.1rem;
    color: #222;
  }
  .product p {
    margin: 0 0 10px;
    font-weight: bold;
    color: #555;
  }
  .product button {
    background: #dc3545;
    border: none;
    color: white;
    padding: 8px 14px;
    cursor: pointer;
    border-radius: 5px;
    transition: background 0.3s ease;
  }
  .product button:hover {
    background: #a71d2a;
  }
  #summary {
    margin-top: 30px;
    font-size: 1.2rem;
    font-weight: bold;
    color: #333;
    text-align: center;
  }
  #loading {
    text-align: center;
    margin: 10px 0;
    color: #666;
  }
</style>
</head>
<body>

<h1>Big Simple E-commerce Store</h1>

<div id="message"></div>

<form id="product-form">
  <input type="text" id="name" placeholder="Product Name" required />
  <input type="number" id="price" placeholder="Price" required min="0.01" step="0.01"/>
  <input type="url" id="image" placeholder="Image URL" required />
  <button type="submit">Add Product</button>
</form>

<div id="loading" style="display:none;">Loading...</div>

<div id="products"></div>

<div id="summary"></div>

<script>
  const form = document.getElementById('product-form');
  const productsDiv = document.getElementById('products');
  const messageDiv = document.getElementById('message');
  const summaryDiv = document.getElementById('summary');
  const loadingDiv = document.getElementById('loading');

  function showLoading(show) {
    loadingDiv.style.display = show ? 'block' : 'none';
  }

  function showMessage(msg, isError = true) {
    messageDiv.textContent = msg;
    messageDiv.style.color = isError ? 'red' : 'green';
    if(msg) {
      setTimeout(() => { messageDiv.textContent = ''; }, 3000);
    }
  }

  async function fetchProducts() {
    try {
      showLoading(true);
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      const products = await res.json();
      renderProducts(products);
      renderSummary(products);
    } catch(e) {
      showMessage(e.message);
    } finally {
      showLoading(false);
    }
  }

  function renderProducts(products) {
    productsDiv.innerHTML = '';
    if(products.length === 0) {
      productsDiv.innerHTML = '<p>No products yet. Add some!</p>';
      return;
    }
    products.forEach(p => {
      const el = document.createElement('div');
      el.className = 'product';
      el.innerHTML = \`
        <img src="\${p.image}" alt="\${p.name}" />
        <h3>\${p.name}</h3>
        <p>$\${p.price.toFixed(2)}</p>
        <button data-id="\${p._id}">Delete</button>
      \`;
      el.querySelector('button').onclick = () => deleteProduct(p._id);
      productsDiv.appendChild(el);
    });
  }

  function renderSummary(products) {
    const total = products.reduce((acc, p) => acc + p.price, 0);
    summaryDiv.textContent = \`Total Products: \${products.length} | Total Price: $\${total.toFixed(2)}\`;
  }

  async function deleteProduct(id) {
    if(!confirm('Are you sure you want to delete this product?')) return;
    try {
      showLoading(true);
      const res = await fetch('/api/products/' + id, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete product');
      showMessage('Product deleted', false);
      fetchProducts();
    } catch(e) {
      showMessage(e.message);
    } finally {
      showLoading(false);
    }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = form.name.value.trim();
    const price = parseFloat(form.price.value);
    const image = form.image.value.trim();
    if (!name || price <= 0 || !image) {
      showMessage('Please fill all fields with valid values');
      return;
    }

    try {
      showLoading(true);
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, price, image })
      });
      if (!res.ok) throw new Error('Failed to add product');
      form.reset();
      showMessage('Product added successfully!', false);
      fetchProducts();
    } catch(e) {
      showMessage(e.message);
    } finally {
      showLoading(false);
    }
  });

  fetchProducts();
</script>

</body>
</html>
  `);
});

// API routes

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch {
    res.status(500).json({ message: 'Failed to load products' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, price, image } = req.body;
    if(!name || !price || !image) return res.status(400).json({ message: 'Missing fields' });
    const product = new Product({ name, price, image });
    await product.save();
    res.status(201).json(product);
  } catch {
    res.status(500).json({ message: 'Failed to add product' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

app.listen(5000, () => {
  console.log('Server running at http://localhost:5000');
});
