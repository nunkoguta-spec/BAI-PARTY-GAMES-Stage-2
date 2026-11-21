# DEUTSCH ADVENTURE — ATURAN PROYEK

## 1. IDENTITAS PROYEK

Anda sedang mengerjakan Deutsch Adventure, sebuah gim platformer 2D bergaya piksel (pixel-art) multipemain yang dirancang untuk pembelajaran bahasa Jerman secara interaktif.

Mekanisme inti gim:
- Pemain menjelajahi dunia platformer dengan tampilan *side-scrolling*.
- Pemain melompat ke arah atau menyentuh blok bertanda tanya.
- Blok bertanda tanya akan memicu pertanyaan kuis bahasa Jerman.
- Jawaban yang benar akan memberikan poin.
- Pemain dapat saling berkompetisi dalam ruang permainan multipemain.
- *Host* (penyelenggara) dapat memantau pemain, skor, dan aktivitas permainan secara *real-time*.

Gim ini harus terasa seperti gim independen (*indie*) yang dipoles dengan baik dan dirancang secara matang — BUKAN sekadar prototipe hasil buatan AI.

## 2. ATURAN MUTLAK

### A. HINDARI UI BERKUALITAS RENDAH HASIL AI

Jangan pernah membuat:
- Tata letak dasbor generik buatan AI.
- Gradien berlebihan, gaya *glassmorphism*, atau bingkai yang berpendar (*glowing*).
- Elemen dekoratif atau kartu yang melayang tanpa tujuan.
- Lencana, label, statistik, atau panel yang tidak diperlukan.
- Ruang kosong yang terlalu luas.
- Kontainer dengan sudut yang terlalu melengkung.
- Tata letak berbasis kartu yang repetitif.
- Notifikasi palsu atau elemen UI yang tidak bermakna.
- Teks yang tidak perlu, seperti "DE PUNKT RICHTIG".
- Tombol palsu yang tidak memiliki fungsi.
- Konten *placeholder* (pengisi sementara) yang disajikan seolah-olah merupakan fitur yang sudah selesai.

Setiap elemen UI harus memiliki tujuan yang jelas.

Desain harus kohesif, terencana, bersih, dan konsisten.

### B. UTAMAKAN MEKANISME PERMAINAN (*GAMEPLAY*)

Fungsionalitas permainan memiliki prioritas lebih tinggi daripada perancangan ulang visual.

Jangan pernah mengorbankan:
- Pergerakan pemain.
- Fisika lompatan.
- Deteksi tabrakan (*collision detection*).
- Interaksi dengan blok bertanda tanya.
- Sinkronisasi multipemain.
- Pergerakan kamera.
- Kontrol sentuh.
- Kontrol desktop.

Jangan mengganti mekanisme yang sudah berfungsi dengan *mockup* visual.

Jangan pernah menganggap suatu fitur sudah selesai hanya karena tampilan UI-nya terlihat benar.

### C. PERTAHANKAN ARSITEKTUR YANG SUDAH ADA

Sebelum melakukan perubahan:
1. Periksa struktur proyek secara menyeluruh.
2. Baca berkas `package.json`.
3. Periksa konfigurasi Phaser 3 yang sudah ada.
4. Periksa *scene*, entitas, dan sistem fisika yang sedang berjalan.
5. Periksa server multipemain dan sistem jaringannya. 6. Periksa manajemen ruangan yang sudah ada.
7. Periksa pemuatan aset dan komponen antarmuka pengguna (UI) yang sudah ada.

Pertahankan teknologi dan arsitektur yang ada selama memungkinkan.

Penggunaan Phaser 3 bersifat wajib.

Jika React, TypeScript, Colyseus, Zustand, Tailwind CSS, atau Howler.js sudah digunakan, pertahankan implementasi tersebut kecuali terdapat alasan teknis terdokumentasi yang mengharuskan perubahan.

Jangan pernah beralih ke mesin gim (game engine) lain.

Jangan pernah membangun ulang seluruh aplikasi dari awal.

Jangan pernah menghapus fungsionalitas yang ada tanpa memahami dependensinya.

### D. HANYA FUNGSIONALITAS NYATA

Setiap tombol harus berfungsi.

Setiap interaksi harus memiliki implementasi nyata.

Setiap fitur multipemain harus berkomunikasi dengan server yang sesungguhnya.

Jangan pernah menyimulasikan multipemain menggunakan pemain palsu lokal.

Jangan pernah menggunakan data papan peringkat (leaderboard) yang dikodekan secara statis (hardcoded) sebagai skor pemain asli.

Jangan pernah menampilkan koneksi ruangan palsu.

Jika suatu fitur tidak dapat diselesaikan, jelaskan dengan jelas bagian apa yang belum ada.

## 3. SISTEM DESAIN VISUAL

Arahan seni (Art direction):
- Gim platformer seni piksel (pixel-art) 2D berkualitas tinggi.
- Skala piksel yang konsisten.
- Palet warna yang dipilih dengan cermat.
- Latar belakang berlapis yang indah.
- Medan dan dekorasi lingkungan yang mendetail.
- Proporsi karakter yang konsisten.
- Animasi yang halus dan mudah dipahami.
- Antarmuka pengguna (HUD) yang minimalis namun dipoles dengan baik.

Hindari mencampur gaya seni yang tidak saling berkaitan.

Gunakan tipografi dan spasi yang konsisten.

Pertahankan ketajaman seni piksel. Hindari penskalaan sprite yang membuatnya terlihat kabur.

Gunakan pengaturan rendering seni piksel pada Phaser dengan tepat.

Antarmuka pengguna (UI) harus dapat beradaptasi dengan:
- Desktop.
- Laptop.
- Tablet.
- Ponsel.
- Tata letak lanskap maupun potret (jika didukung).

Kontrol sentuh tidak boleh menutupi elemen permainan yang penting.

## 4. ASET DAN PUSTAKA

Lakukan riset terlebih dahulu mengenai aset dan pustaka yang sudah ada sebelum membuat penggantinya.

Sumber aset yang disarankan:
- Kenney.nl
- OpenGameArt.org
- Aset gim gratis dari itch.io.
- Sumber daya resmi dari Phaser.

Aset yang disarankan:
- Sprite karakter seni piksel.
- Kumpulan ubin (tileset) untuk platformer.
- Lapisan latar belakang.
- Dekorasi lingkungan.
- Elemen antarmuka pengguna (UI).
- Efek suara.

Aturan:
1. Prioritaskan aset dengan lisensi CC0 atau lisensi lain yang bersifat sangat permisif. 2. Verifikasi lisensi sebelum mengintegrasikan aset.
3. Jangan pernah menggunakan *sprite* gim yang memiliki hak cipta tanpa izin.
4. Jangan mengunduh aset yang tidak relevan atau tidak diperlukan.
5. Jangan memasang pustaka (*library*) yang menduplikasi fungsionalitas yang sudah ada.
6. Periksa kompatibilitas paket sebelum melakukan instalasi.
7. Pastikan aset tetap terorganisasi sesuai dengan struktur aset yang sudah ada.
8. Catat sumber dan lisensi setiap aset.

Jangan gunakan URL gambar eksternal sebagai aset gim permanen. Unduh dan atur aset yang telah disetujui secara lokal.

## 5. ATURAN PHASER 3

Phaser 3 bertanggung jawab atas dunia gim yang sebenarnya.

Gunakan arsitektur Phaser yang tepat:
- *Scenes* (Adegan).
- *Game Objects* (Objek Gim).
- *Arcade Physics* (Fisika Arkade).
- *Animations* (Animasi).
- *Cameras* (Kamera).
- Manajemen input.
- *Tilemaps* (Peta ubin) jika diperlukan.

Pergerakan pemain harus memiliki:
- Pergerakan horizontal yang mulus.
- Lompatan yang responsif.
- Gravitasi yang sesuai.
- Deteksi tabrakan dengan tanah.
- Batas tabrakan yang stabil.
- Perilaku yang konsisten di berbagai perangkat.

Kamera:
- Ikuti pemain yang aktif atau gunakan strategi kamera untuk multipemain yang telah ditetapkan.
- Mendukung peta horizontal yang panjang.
- Atur