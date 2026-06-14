# 📚 Dokumentasi Arsitektur & Alur Kerja: Personal Learning Tracker

Dokumen ini berisi penjelasan teknis mengenai bagaimana aplikasi *Personal Learning Tracker* bekerja di belakang layar. Aplikasi ini menggunakan arsitektur **Serverless / Backend-as-a-Service (BaaS)** yang sangat efisien dan aman tanpa memerlukan server *backend* tradisional (seperti Node.js atau PHP).

---

## 🛠️ Tech Stack (Teknologi yang Digunakan)
- **Frontend Framework:** Next.js (App Router) & React
- **Styling:** Tailwind CSS v4 (Dark Mode Default)
- **Icons:** Lucide React
- **Image Compression:** `browser-image-compression`
- **Backend, Database, & Auth:** Supabase (PostgreSQL & Storage)

---

## 🏗️ 1. Arsitektur Backend (Supabase Magic)

Aplikasi ini **tidak memiliki server backend khusus**. Semua operasi database dan autentikasi berkomunikasi langsung dari browser (Frontend) ke Supabase menggunakan *library* `@supabase/supabase-js`. 

### Keamanan (Row Level Security / RLS)
Pertanyaan terbesar pada arsitektur ini adalah: *"Jika Frontend menembak langsung ke Database, apakah aman?"*
Jawabannya: **Sangat Aman**, berkat RLS di PostgreSQL.

```sql
CREATE POLICY "Manage own materials" ON materials FOR ALL USING (auth.uid() = user_id);
```
Aturan SQL di atas adalah "satpam" utama kita. Walaupun *hacker* mengetahui URL dan Key Supabase kita, mereka tidak bisa membaca atau menghapus catatan kita karena Supabase akan memvalidasi *Token Login* pengguna. Jika pengguna tidak *login*, atau ID penggunanya berbeda dengan pemilik catatan, akses otomatis ditolak.

### Struktur Tabel Database
1. **`folders`**: Tabel untuk menyimpan kategori catatan.
   - Kolom: `id` (UUID), `user_id` (Relasi ke Auth), `name`, `created_at`.
2. **`materials`**: Tabel untuk menyimpan isi catatan.
   - Kolom: `id` (UUID), `folder_id` (Relasi ke folders, dengan `ON DELETE CASCADE`), `user_id`, `title`, `content`, `images` (Array of Strings), `created_at`.

---

## 📸 2. Alur Kompresi & Upload Gambar (Frontend Logic)

Mengingat ukuran foto dari kamera HP modern sangat besar (bisa 5-10MB), kita **wajib** melakukan kompresi sebelum data dikirim ke Supabase Storage. Hal ini menghemat kuota internet pengguna dan ruang penyimpanan di Supabase.

Kompresi terjadi murni di dalam *browser* (tanpa membebani server).
File rujukan: `components/MaterialsView.tsx`

### Tahapan Upload:
1. **Pilih File:** Pengguna memilih satu atau beberapa foto lewat input file.
2. **Kompresi Lokal (Browser):**
   ```javascript
   const options = {
     maxSizeMB: 0.5,        // Target ukuran maksimum 500KB
     maxWidthOrHeight: 1920, // Batasi dimensi maksimum ke 1080p
     useWebWorker: true,     // Gunakan thread belakang agar web tidak nge-lag
   };
   const compressedFile = await imageCompression(file, options);
   ```
3. **Upload ke Storage:**
   File yang sudah dikompresi diunggah ke Supabase Storage (`material-assets` bucket).
   ```javascript
   await supabase.storage.from("material-assets").upload(filePath, compressedFile);
   ```
4. **Dapatkan URL Publik:**
   Setelah berhasil diunggah, kita mengambil URL Publik gambar tersebut.
5. **Simpan ke Database:**
   URL Publik dari semua gambar akan dimasukkan ke dalam *array* `uploadedUrls` dan disimpan ke kolom `images` di tabel `materials`.

---

## 📱 3. UI/UX Workflow (Alur Antarmuka)

Aplikasi dirancang secara *responsive* dan mengutamakan kecepatan mencatat.

- **Status "Belum Login"**: Jika tidak ada sesi (*session*), aplikasi mengalihkan pengguna ke `/login`.
- **Mode Mobile (Layar HP)**: Sidebar yang berisi daftar Folder berubah menjadi *Top Navigation Bar* dengan *horizontal scroll*. Hal ini mencegah daftar folder memakan ruang vertikal, sehingga fokus utama (membaca/mengetik catatan) menjadi maksimal.
- **Image Lightbox (Zoom)**: Karena catatan berisi foto tulisan tangan (buku manual), mengklik foto pada catatan akan men- *trigger* state `zoomedImage`. Foto akan membesar secara penuh (*full-screen*) menggunakan *overlay* CSS Backdrop Blur.
- **Empty States**: Menampilkan kotak dengan garis putus-putus (*dashed border*) jika pengguna belum membuat catatan atau sedang melakukan pencarian (*search*) yang tidak menghasilkan *output*.
