/**
 * ProductFlow — app.js
 * SPA CRUD dengan DummyJSON API
 * Menggunakan: Vanilla JS · Fetch API · async/await · try...catch
 *
 * HTTP Methods yang digunakan:
 *  - POST   → Tambah produk baru
 *  - PUT    → Update/edit produk
 *  - DELETE → Hapus produk
 */

'use strict';

/* ═══════════════════════════════════════════════════
   KONFIGURASI
   ═══════════════════════════════════════════════════ */
const API_BASE = 'https://dummyjson.com/products';
const LOAD_LIMIT = 12; // jumlah produk yang dimuat dari API

/* ═══════════════════════════════════════════════════
   STATE APLIKASI
   ═══════════════════════════════════════════════════ */
const state = {
  products: [],       // array produk yang tampil di UI
  editingId: null,    // ID produk yang sedang diedit
  deletingId: null,   // ID produk yang akan dihapus (untuk modal konfirmasi)
  addedCount: 0,      // counter produk yang berhasil ditambah
  editedCount: 0,     // counter produk yang berhasil diedit
  isLoading: false,   // flag loading global
};

/* ═══════════════════════════════════════════════════
   REFERENSI ELEMEN DOM
   ═══════════════════════════════════════════════════ */
const $  = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
  productGrid:     $('productGrid'),
  skeletonList:    $('skeletonList'),
  emptyState:      $('emptyState'),
  productName:     $('productName'),
  productPrice:    $('productPrice'),
  productCategory: $('productCategory'),
  editingId:       $('editingId'),
  submitBtn:       $('submitBtn'),
  cancelBtn:       $('cancelBtn'),
  loadMoreBtn:     $('loadMoreBtn'),
  formTitle:       $('formTitle'),
  formIcon:        $('formIcon'),
  notification:    $('notification'),
  methodIndicator: $('methodIndicator'),
  totalCount:      $('totalCount'),
  addedCount:      $('addedCount'),
  editedCount:     $('editedCount'),
  toastContainer:  $('toastContainer'),
  modalOverlay:    $('modalOverlay'),
  modalBody:       $('modalBody'),
  confirmDeleteBtn: $('confirmDeleteBtn'),
  cancelDeleteBtn:  $('cancelDeleteBtn'),
  searchInput:     $('searchInput'),
};

/* ═══════════════════════════════════════════════════
   UTILITAS
   ═══════════════════════════════════════════════════ */

/**
 * Tampilkan toast notification di pojok kanan bawah
 * @param {string} message - pesan yang ditampilkan
 * @param {'post'|'put'|'delete'|'error'} type - jenis toast
 */
function showToast(message, type = 'post') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}-toast`;
  toast.innerHTML = `<span class="toast-dot"></span>${message}`;
  DOM.toastContainer.appendChild(toast);

  // Auto-remove setelah 3.5 detik
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.25s ease forwards';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

/**
 * Tampilkan pesan error/sukses di form panel (inline notification)
 * @param {string} message
 * @param {'error'|'success'} type
 */
function showNotification(message, type = 'error') {
  DOM.notification.textContent = message;
  DOM.notification.className = `notification ${type}`;

  // Auto-hide sukses setelah 4 detik
  if (type === 'success') {
    setTimeout(() => {
      DOM.notification.className = 'notification';
    }, 4000);
  }
}

function hideNotification() {
  DOM.notification.className = 'notification';
}

/**
 * Update method indicator di form
 * @param {'post'|'put'} method
 */
function updateMethodIndicator(method) {
  const indicator = DOM.methodIndicator;
  const dot = indicator.querySelector('.method-dot');
  const label = indicator.querySelector('.method-label');

  if (method === 'post') {
    dot.className = 'method-dot post';
    label.textContent = 'POST /products/add';
  } else if (method === 'put') {
    dot.className = 'method-dot put';
    label.textContent = `PUT /products/${state.editingId}`;
  }
}

/**
 * Update statistik di form panel
 */
function updateStats() {
  DOM.totalCount.textContent = state.products.length;
  DOM.addedCount.textContent = state.addedCount;
  DOM.editedCount.textContent = state.editedCount;
}

/**
 * Set tombol submit ke status loading
 * @param {boolean} isLoading
 * @param {string} text - teks saat tidak loading
 */
function setSubmitLoading(isLoading, text = '') {
  const btn = DOM.submitBtn;
  if (isLoading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
    if (text) {
      btn.querySelector('.btn-text').textContent = text;
    }
  }
}

/**
 * Format harga ke string USD
 * @param {number} price
 * @returns {string}
 */
function formatPrice(price) {
  const num = parseFloat(price) || 0;
  return `$${num.toFixed(2)}`;
}

/**
 * Generate ID unik untuk item yang ditambah secara lokal
 * (DummyJSON selalu mengembalikan ID = 194 untuk semua POST, jadi kita buat ID unik)
 * @returns {string}
 */
function generateLocalId() {
  return `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/* ═══════════════════════════════════════════════════
   RENDER UI
   ═══════════════════════════════════════════════════ */

/**
 * Buat elemen kartu produk
 * @param {Object} product
 * @returns {HTMLElement}
 */
function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.dataset.id = product.id;

  // Tandai kartu baru atau yang diedit
  if (product._isNew) card.classList.add('new-item');
  if (product._isEdited) card.classList.add('edited-item');

  const idType = product._isNew ? 'new' : product._isEdited ? 'edit' : 'api';
  const idLabel = product._isNew
    ? 'BARU DITAMBAH'
    : product._isEdited
    ? 'DIEDIT'
    : `ID #${product.id}`;

  card.innerHTML = `
    <div class="card-id">
      <span class="card-id-dot ${idType}"></span>
      <span>${idLabel}</span>
    </div>
    <div class="card-name">${escapeHtml(product.title)}</div>
    <div class="card-meta">
      <span class="card-price">${formatPrice(product.price)}</span>
      <span class="card-category">${escapeHtml(product.category || 'Umum')}</span>
    </div>
    <div class="card-actions">
      <button class="btn-edit" data-id="${product.id}" title="Edit produk ini">✎ Edit</button>
      <button class="btn-delete" data-id="${product.id}" title="Hapus produk ini">✕ Hapus</button>
    </div>
  `;

  // Event listener tombol Edit
  card.querySelector('.btn-edit').addEventListener('click', () => {
    handleEditClick(product.id);
  });

  // Event listener tombol Hapus
  card.querySelector('.btn-delete').addEventListener('click', () => {
    handleDeleteClick(product.id);
  });

  return card;
}

/**
 * Render ulang semua produk ke DOM
 * @param {Array} products - (opsional) override array, default pakai state.products
 */
function renderProducts(products = state.products) {
  DOM.productGrid.innerHTML = '';

  if (products.length === 0) {
    DOM.emptyState.style.display = 'block';
    return;
  }

  DOM.emptyState.style.display = 'none';

  products.forEach((p, i) => {
    const card = createProductCard(p);
    // Stagger animation
    card.style.animationDelay = `${i * 0.04}s`;
    DOM.productGrid.appendChild(card);
  });

  updateStats();
}

/**
 * Sembunyikan skeleton loader
 */
function hideSkeleton() {
  DOM.skeletonList.style.display = 'none';
}

/**
 * Escape HTML entities untuk keamanan XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

/* ═══════════════════════════════════════════════════
   FORM HELPERS
   ═══════════════════════════════════════════════════ */

/**
 * Reset form ke mode tambah produk
 */
function resetForm() {
  DOM.productName.value = '';
  DOM.productPrice.value = '';
  DOM.productCategory.value = '';
  DOM.editingId.value = '';
  state.editingId = null;

  DOM.formTitle.textContent = 'Tambah Produk';
  DOM.formIcon.textContent = '✦';
  DOM.submitBtn.querySelector('.btn-text').textContent = 'Tambah Produk';
  DOM.submitBtn.querySelector('.btn-icon').textContent = '+';
  DOM.submitBtn.classList.remove('edit-mode');
  DOM.cancelBtn.style.display = 'none';

  updateMethodIndicator('post');
  hideNotification();
}

/**
 * Isi form dengan data produk untuk mode edit
 * @param {Object} product
 */
function fillFormForEdit(product) {
  DOM.productName.value = product.title;
  DOM.productPrice.value = product.price;
  DOM.productCategory.value = product.category || '';
  DOM.editingId.value = product.id;
  state.editingId = product.id;

  DOM.formTitle.textContent = 'Edit Produk';
  DOM.formIcon.textContent = '✎';
  DOM.submitBtn.querySelector('.btn-text').textContent = 'Simpan Perubahan';
  DOM.submitBtn.querySelector('.btn-icon').textContent = '✓';
  DOM.submitBtn.classList.add('edit-mode');
  DOM.cancelBtn.style.display = '';

  updateMethodIndicator('put');
  hideNotification();

  // Scroll ke form (di mobile)
  DOM.productName.scrollIntoView({ behavior: 'smooth', block: 'center' });
  DOM.productName.focus();
}

/**
 * Validasi input form
 * @returns {{valid: boolean, name: string, price: number, category: string}}
 */
function validateForm() {
  const name = DOM.productName.value.trim();
  const price = parseFloat(DOM.productPrice.value);
  const category = DOM.productCategory.value.trim() || 'Umum';

  if (!name) {
    showNotification('⚠ Nama produk tidak boleh kosong.', 'error');
    DOM.productName.focus();
    return { valid: false };
  }

  if (isNaN(price) || price < 0) {
    showNotification('⚠ Masukkan harga yang valid (angka ≥ 0).', 'error');
    DOM.productPrice.focus();
    return { valid: false };
  }

  return { valid: true, name, price, category };
}

/* ═══════════════════════════════════════════════════
   API CALLS
   ═══════════════════════════════════════════════════ */

/**
 * 1. LOAD produk dari API (GET — hanya untuk memuat data awal)
 * Note: GET boleh digunakan hanya untuk inisialisasi data tampilan awal.
 */
async function loadProductsFromAPI() {
  DOM.loadMoreBtn.disabled = true;
  DOM.loadMoreBtn.textContent = 'Memuat…';

  try {
    const response = await fetch(`${API_BASE}?limit=${LOAD_LIMIT}&select=id,title,price,category`);

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Ganti seluruh list dengan data dari API (pertahankan item lokal yang baru ditambah)
    const localItems = state.products.filter(p => String(p.id).startsWith('local-'));
    state.products = [...data.products, ...localItems];

    hideSkeleton();
    renderProducts();
    updateStats();

    showToast(`${data.products.length} produk berhasil dimuat`, 'post');

  } catch (error) {
    hideSkeleton();
    showNotification(`❌ Gagal memuat data: ${error.message}`, 'error');
    showToast(`Error: ${error.message}`, 'error');
    DOM.emptyState.style.display = 'block';
    console.error('[ProductFlow] loadProductsFromAPI error:', error);

  } finally {
    DOM.loadMoreBtn.disabled = false;
    DOM.loadMoreBtn.textContent = 'Muat Data API';
  }
}

/**
 * 2. TAMBAH PRODUK — HTTP POST
 * @param {string} name
 * @param {number} price
 * @param {string} category
 */
async function addProduct(name, price, category) {
  setSubmitLoading(true);

  try {
    // ── HTTP POST REQUEST ──────────────────────────
    const response = await fetch(`${API_BASE}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: name,
        price: price,
        category: category,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    // DummyJSON mengembalikan ID 194 untuk semua POST (fake API)
    // Kita ganti ID-nya agar tidak konflik jika ada multiple POST
    const newProduct = {
      ...data,
      id: generateLocalId(),
      title: name,       // gunakan input user, bukan data dari server
      price: price,
      category: category,
      _isNew: true,      // flag untuk styling
    };

    // Tambah ke state dan render
    state.products.unshift(newProduct);  // tambah di depan
    state.addedCount++;
    renderProducts();

    showNotification(`✓ Produk "${name}" berhasil ditambahkan! (Server response ID: ${data.id})`, 'success');
    showToast(`POST sukses: "${name}" ditambahkan`, 'post');
    resetForm();

    console.log('[ProductFlow] POST response:', data);

  } catch (error) {
    showNotification(`❌ Gagal menambah produk: ${error.message}`, 'error');
    showToast(`POST Error: ${error.message}`, 'error');
    console.error('[ProductFlow] addProduct error:', error);

  } finally {
    setSubmitLoading(false, 'Tambah Produk');
  }
}

/**
 * 3. EDIT PRODUK — HTTP PUT
 * @param {string|number} productId
 * @param {string} name
 * @param {number} price
 * @param {string} category
 */
async function editProduct(productId, name, price, category) {
  setSubmitLoading(true);

  // Tentukan endpoint; produk lokal (ID string) tetap dikirim ke /products/1
  const isLocal = String(productId).startsWith('local-');
  const apiId = isLocal ? 1 : productId;  // DummyJSON menerima ID 1–194

  try {
    // ── HTTP PUT REQUEST ──────────────────────────
    const response = await fetch(`${API_BASE}/${apiId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: name,
        price: price,
        category: category,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[ProductFlow] PUT response:', data);

    // Update state lokal dengan data yang diisi user
    // (bukan data respons server karena fake API mungkin reset data)
    const idx = state.products.findIndex(p => p.id == productId);
    if (idx !== -1) {
      state.products[idx] = {
        ...state.products[idx],
        title: name,
        price: price,
        category: category,
        _isNew: false,
        _isEdited: true,   // tandai sebagai diedit
      };
    }

    state.editedCount++;
    renderProducts();

    showNotification(`✓ Produk "${name}" berhasil diperbarui!`, 'success');
    showToast(`PUT sukses: "${name}" diperbarui`, 'put');
    resetForm();

  } catch (error) {
    showNotification(`❌ Gagal mengedit produk: ${error.message}`, 'error');
    showToast(`PUT Error: ${error.message}`, 'error');
    console.error('[ProductFlow] editProduct error:', error);

  } finally {
    setSubmitLoading(false, 'Simpan Perubahan');
  }
}

/**
 * 4. HAPUS PRODUK — HTTP DELETE
 * @param {string|number} productId
 */
async function deleteProduct(productId) {
  // Disable tombol konfirmasi saat proses
  DOM.confirmDeleteBtn.disabled = true;
  DOM.confirmDeleteBtn.textContent = 'Menghapus…';

  const isLocal = String(productId).startsWith('local-');
  const apiId = isLocal ? 1 : productId;

  try {
    // ── HTTP DELETE REQUEST ──────────────────────────
    const response = await fetch(`${API_BASE}/${apiId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[ProductFlow] DELETE response:', data);

    // DummyJSON mengembalikan { isDeleted: true } jika sukses
    if (data.isDeleted) {
      // Animasi keluar pada kartu
      const card = DOM.productGrid.querySelector(`[data-id="${productId}"]`);
      if (card) {
        card.classList.add('removing');
        await new Promise(resolve => setTimeout(resolve, 280));
      }

      // Hapus dari state
      const product = state.products.find(p => p.id == productId);
      state.products = state.products.filter(p => p.id != productId);
      renderProducts();

      showToast(`DELETE sukses: "${product?.title || 'Produk'}" dihapus`, 'delete');
    } else {
      throw new Error('Server tidak mengonfirmasi penghapusan (isDeleted: false)');
    }

    closeModal();

  } catch (error) {
    showNotification(`❌ Gagal menghapus produk: ${error.message}`, 'error');
    showToast(`DELETE Error: ${error.message}`, 'error');
    console.error('[ProductFlow] deleteProduct error:', error);
    closeModal();

  } finally {
    DOM.confirmDeleteBtn.disabled = false;
    DOM.confirmDeleteBtn.textContent = 'Ya, Hapus';
  }
}

/* ═══════════════════════════════════════════════════
   EVENT HANDLERS
   ═══════════════════════════════════════════════════ */

/**
 * Handle klik tombol Submit (Tambah / Simpan)
 */
async function handleSubmit() {
  const { valid, name, price, category } = validateForm();
  if (!valid) return;

  if (state.editingId !== null) {
    // Mode EDIT → PUT
    await editProduct(state.editingId, name, price, category);
  } else {
    // Mode TAMBAH → POST
    await addProduct(name, price, category);
  }
}

/**
 * Handle klik tombol Edit pada kartu produk
 * @param {string|number} productId
 */
function handleEditClick(productId) {
  const product = state.products.find(p => p.id == productId);
  if (!product) {
    showNotification('⚠ Produk tidak ditemukan di daftar.', 'error');
    return;
  }
  fillFormForEdit(product);
}

/**
 * Handle klik tombol Hapus pada kartu produk
 * @param {string|number} productId
 */
function handleDeleteClick(productId) {
  const product = state.products.find(p => p.id == productId);
  if (!product) return;

  state.deletingId = productId;
  DOM.modalBody.textContent =
    `Produk "${product.title}" akan dihapus. Request DELETE akan dikirim ke server. Jika berhasil, item akan hilang dari tampilan.`;
  openModal();
}

/**
 * Buka modal konfirmasi hapus
 */
function openModal() {
  DOM.modalOverlay.classList.add('active');
}

/**
 * Tutup modal konfirmasi hapus
 */
function closeModal() {
  DOM.modalOverlay.classList.remove('active');
  state.deletingId = null;
}

/**
 * Handle pencarian produk (filter lokal)
 * @param {string} query
 */
function handleSearch(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderProducts();
    return;
  }

  const filtered = state.products.filter(p =>
    p.title.toLowerCase().includes(q) ||
    (p.category || '').toLowerCase().includes(q)
  );

  renderProducts(filtered);
}

/* ═══════════════════════════════════════════════════
   EVENT LISTENERS
   ═══════════════════════════════════════════════════ */

// Submit form
DOM.submitBtn.addEventListener('click', handleSubmit);

// Enter key di input
[DOM.productName, DOM.productPrice, DOM.productCategory].forEach(input => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubmit();
  });
});

// Batal edit
DOM.cancelBtn.addEventListener('click', resetForm);

// Muat data dari API
DOM.loadMoreBtn.addEventListener('click', loadProductsFromAPI);

// Konfirmasi hapus
DOM.confirmDeleteBtn.addEventListener('click', () => {
  if (state.deletingId !== null) {
    deleteProduct(state.deletingId);
  }
});

// Batal hapus
DOM.cancelDeleteBtn.addEventListener('click', closeModal);

// Klik overlay modal untuk tutup
DOM.modalOverlay.addEventListener('click', (e) => {
  if (e.target === DOM.modalOverlay) closeModal();
});

// Escape key untuk tutup modal / cancel edit
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (DOM.modalOverlay.classList.contains('active')) {
      closeModal();
    } else if (state.editingId !== null) {
      resetForm();
    }
  }
});

// Pencarian produk
let searchDebounce;
DOM.searchInput.addEventListener('input', (e) => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => handleSearch(e.target.value), 280);
});

/* ═══════════════════════════════════════════════════
   INISIALISASI
   ═══════════════════════════════════════════════════ */
(async function init() {
  console.log('[ProductFlow] Inisialisasi aplikasi…');
  updateStats();

  // Muat data awal dari API secara otomatis
  await loadProductsFromAPI();
})();
