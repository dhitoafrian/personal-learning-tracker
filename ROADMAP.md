# 🚀 Roadmap Aplikasi Personal Learning Tracker

Dokumen ini berisi tahap-tahap eksekusi (roadmap) untuk membangun aplikasi *Personal Learning Tracker* dengan nuansa modern, minimalis, *dark mode default*, dan *anti-AI*.

## 🏗️ Tahap 1: Fondasi UI & Layout Dasar (Minggu 1)
**Fokus:** Membangun *skeleton* aplikasi, menerapkan desain *dark mode*, dan mengganti aset-aset non-profesional (emoji).

- [x] **Setup Tailwind & Dark Mode:** Memastikan konfigurasi Tailwind di Next.js menggunakan palet warna gelap (*Zinc* atau *Neutral*) sebagai *default background*.
- [x] **Instalasi Ikon:** Menginstal library `lucide-react` untuk menggantikan semua emoji dengan ikon *outline* minimalis.
- [x] **Refaktor Sidebar (`components/Sidebar.tsx`):** Merapikan UI Sidebar agar tampil *sleek*, menambahkan ikon Folder dari Lucide, dan memperbaiki kontras warna.
- [x] **Membangun Global Layout (`app/layout.tsx` & `app/page.tsx`):** Menyatukan Sidebar dan area Main Content dengan sistem flex/grid yang rapi.
- [x] **Tipografi:** Menyesuaikan global font (Inter/Geist) agar terlihat profesional.

## 🗄️ Tahap 2: Manajemen Folder & Integrasi Supabase (Minggu 1-2)
**Fokus:** Menghidupkan fungsionalitas CRUD (Create, Read, Update, Delete) untuk Folder.

- [x] **Koneksi Supabase:** Memastikan Supabase *client* berfungsi baik di *Client Component* maupun *Server Component*.
- [x] **Sistem Auth (Basic):** Memastikan halaman Login/Middleware sederhana agar aplikasi aman dan hanya bisa diakses oleh Anda (terintegrasi dengan RLS `auth.uid()`).
- [x] **Fetch Data Folder:** Menampilkan *list* folder dari database Supabase ke Sidebar.
- [x] **Tambah & Hapus Folder:** Menyempurnakan form "Tambah Folder" di Sidebar dan menambahkan fungsionalitas Hapus/Rename.

## 📝 Tahap 3: Fitur Inti (Catatan & Upload Foto) (Minggu 2)
**Fokus:** Membuat fitur utama yaitu `materials`, termasuk kompresi gambar di *Frontend*.

- [x] **UI Main Content:** Membuat desain tampilan tabel atau *grid* kartu untuk daftar catatan di dalam sebuah folder.
- [x] **Instalasi Kompresor Gambar:** Menginstal library `browser-image-compression`.
- [x] **Form Tambah Catatan:** Membuat antarmuka/modal untuk menginput Judul, Isi Teks, dan input *File (Images)*.
- [x] **Logika Kompresi & Upload:** 
    - Melakukan kompresi foto di browser.
    - Mengunggah foto yang terkompresi ke *Supabase Storage*.
    - Menyimpan URL foto beserta teks ke dalam tabel `materials` (sebagai array).
- [x] **Tampilkan Catatan:** Me-render isi catatan beserta gambar *thumbnail*-nya di layar utama.

## 📱 Tahap 4: Optimasi Mobile & UX Polish (Minggu 3)
**Fokus:** Memastikan aplikasi nyaman digunakan di *smartphone* untuk kemudahan memfoto catatan secara langsung.

- [x] **Responsive Sidebar:** Menyembunyikan Sidebar di layar kecil dan menggantinya dengan *Hamburger Menu* atau *Bottom Nav*. (Diselesaikan dengan desain top-bar horizontal).
- [x] **Image Lightbox/Zoom:** Menambahkan fitur agar saat gambar/foto catatan di-klik, gambar tersebut membesar (*zoom*) untuk mempermudah membaca tulisan tangan.
- [x] **Feedback State (Loading/Success):** Menambahkan indikator *loading* (spinner atau *skeleton*) saat data sedang di-fetch atau saat foto sedang di-upload agar tidak terasa nge-lag.
- [x] **Final Bug Fix & Cleanup:** Menghapus *console.log* dan merapikan kode.

## 🔧 Tahap 5: Fitur Tambahan (Edit & Detail Content)
**Fokus:** Menambahkan fitur edit catatan dan modal detail untuk tiap konten catatan.

- [x] **Fitur Edit Catatan:** Memungkinkan pengubahan judul/isi catatan, serta penambahan foto baru atau penghapusan foto yang sudah ada.
- [x] **Fitur Detail Catatan:** Membuka modal khusus saat kartu catatan diklik untuk menampilkan teks panjang secara penuh dan memperbesar lampiran foto secara detail.

---
*Catatan: Centang kotak (`[x]`) pada file ini seiring berjalannya progres.*
