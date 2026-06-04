# ProductFlow — SPA CRUD dengan DummyJSON API

Aplikasi web satu halaman (SPA) menggunakan **Vanilla JavaScript**, **Fetch API**, dan **async/await** untuk memanipulasi data produk melalui DummyJSON API.

---

## Struktur File

```
product-manager-spa/
├── index.html   ← Struktur HTML halaman
├── style.css    ← Tampilan / styling
├── app.js       ← Logika JavaScript (CRUD + DOM)
└── README.md    ← Dokumentasi ini
```

---

## Cara Menjalankan

### Cara 1 — Buka Langsung (paling mudah)
1. Ekstrak file ZIP
2. Buka folder `product-manager-spa/`
3. Double-klik file `index.html`
4. Aplikasi langsung berjalan di browser
> Jika font Google tidak termuat (offline), tampilan tetap berfungsi normal dengan fallback font sistem.

### Cara 2 — Live Server (direkomendasikan untuk pengembangan)
1. Install ekstensi **Live Server** di VS Code
2. Klik kanan `index.html` → **Open with Live Server**
3. Browser otomatis terbuka di `http://127.0.0.1:5500`

### Cara 3 — HTTP Server Python
```bash
# Masuk ke folder project
cd product-manager-spa
# Python 3
python -m http.server 8080
# Buka browser ke http://localhost:8080
```
---
## Fitur yang Diimplementasikan

### 1. TAMBAH PRODUK (POST)
- **Endpoint**: `POST https://dummyjson.com/products/add`
- Isi form: Nama Produk, Harga, Kategori
- Klik tombol **"Tambah Produk"** atau tekan **Enter**
- Produk baru langsung muncul di daftar dengan label **"BARU DITAMBAH"**

### 2. EDIT PRODUK (PUT)
- **Endpoint**: `PUT https://dummyjson.com/products/{id}`
- Klik tombol **"✎ Edit"** pada kartu produk
- Form akan terisi otomatis dengan data produk tersebut
- Ubah data, lalu klik **"Simpan Perubahan"**
- Kartu produk diperbarui langsung di layar dengan label **"DIEDIT"**

### 3. HAPUS PRODUK (DELETE)
- **Endpoint**: `DELETE https://dummyjson.com/products/{id}`
- Klik tombol **"✕ Hapus"** pada kartu produk
- Modal konfirmasi akan muncul
- Klik **"Ya, Hapus"** → request DELETE dikirim ke server
- Jika `isDeleted: true`, kartu produk langsung hilang dari layar (tanpa reload)

---

## Ketentuan Teknis

| Ketentuan | Implementasi |
|---|---|
| Vanilla JS (no framework) | ✅ Tidak ada React/Vue/Angular |
| Fetch API | ✅ Semua request menggunakan `fetch()` |
| async/await | ✅ Semua fungsi async menggunakan `await` |
| try...catch | ✅ Setiap blok async dibungkus try...catch |
| Error handling di layar | ✅ Pesan error muncul di form panel & toast |
| Bukan hanya GET | ✅ POST + PUT + DELETE digunakan |
| Manipulasi DOM | ✅ Semua perubahan UI tanpa page reload |

---

## HTTP Methods yang Digunakan

```
POST   → /products/add        → Tambah produk baru
PUT    → /products/{id}       → Edit produk
DELETE → /products/{id}       → Hapus produk
GET    → /products?limit=12   → Muat data awal (hanya untuk inisialisasi)
```

---

## Catatan DummyJSON (Fake API)

DummyJSON adalah **mock/fake API**. Artinya:
- Data yang ditambah/diedit/dihapus **tidak tersimpan permanen** di server
- Setiap POST akan mengembalikan `id: 194` → aplikasi membuat ID unik lokal
- Jika halaman di-refresh, data dari API akan kembali ke semula
- **Fokus penilaian**: logika HTTP request dan manipulasi DOM ✅

---

## Penjelasan Kode Utama (`app.js`)

### State Management
```javascript
const state = {
  products: [],      // array produk yang tampil
  editingId: null,   // ID produk yang sedang diedit
  deletingId: null,  // ID untuk konfirmasi hapus
  addedCount: 0,     // statistik
  editedCount: 0,
};
```

### Fungsi POST (Tambah)
```javascript
async function addProduct(name, price, category) {
  try {
    const response = await fetch(`${API_BASE}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: name, price, category }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    // tambah ke state & render...
  } catch (error) {
    showNotification(`❌ Gagal: ${error.message}`, 'error');
  }
}
```

### Fungsi PUT (Edit)
```javascript
async function editProduct(productId, name, price, category) {
  try {
    const response = await fetch(`${API_BASE}/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: name, price, category }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    // update state & render...
  } catch (error) { /* ... */ }
}
```

### Fungsi DELETE (Hapus)
```javascript
async function deleteProduct(productId) {
  try {
    const response = await fetch(`${API_BASE}/${productId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.isDeleted) {
      // hapus card dari DOM...
    }
  } catch (error) { /* ... */ }
}
```

---

## Informasi Proyek

- **Mata Kuliah**: Pemrograman Web 
- **API**: [DummyJSON](https://dummyjson.com/)
- **Tech Stack**: HTML5, CSS3, Vanilla JavaScript (ES2022)
