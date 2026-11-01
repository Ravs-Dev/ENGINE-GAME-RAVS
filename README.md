# RAVS Engine 3D

Editor game **3D desktop untuk Windows dan Linux**, menggunakan Electron, Three.js, dan WebGL 2. Versi 0.5 menambahkan Project Files, editor script/teks, tema hitam, logo Ravs, serta ekspor game HTML dengan loading screen; mode browser tetap tersedia untuk pengembangan. Pengguna aplikasi hasil build tidak perlu memasang Node.js atau menjalankan server.

## Unduh dan instal

Installer x64 disediakan pada halaman [Releases](https://github.com/Ravs-Dev/ENGINE-GAME-RAVS/releases) setelah workflow rilis selesai:

- **Windows:** `RAVS-Engine-3D-<versi>-win-x64.exe`. Jalankan installer; tersedia pilihan lokasi instalasi dan shortcut.
- **Linux:** `RAVS-Engine-3D-<versi>-linux-x86_64.AppImage`. Beri izin eksekusi (`chmod +x nama-file.AppImage`), lalu jalankan. Distribusi tertentu membutuhkan FUSE 2; alternatifnya jalankan dengan `--appimage-extract-and-run`.
- **Debian/Ubuntu:** `RAVS-Engine-3D-<versi>-linux-amd64.deb`. Instal dengan `sudo apt install ./nama-file.deb`, lalu buka RAVS dari menu aplikasi.

Linux memerlukan sesi desktop dan dukungan WebGL 2. Data scene disimpan pada profil aplikasi pengguna, terpisah dari folder instalasi. Ekspor JSON untuk backup atau memindahkan scene ke komputer lain. Installer Windows versi awal belum ditandatangani sertifikat penerbit; Windows dapat menampilkan peringatan SmartScreen.

## Menjalankan untuk pengembangan

Butuh Node.js 22+ dan browser dengan WebGL 2.

```sh
npm ci
npm run desktop
# Atau gunakan mode browser:
npm start
```

Buka `http://localhost:3000` pada browser lokal. Gunakan `PORT=4000 npm start` untuk port lain. Renderer dibundel secara lokal, sehingga editor desktop tidak membutuhkan CDN, koneksi Internet, atau server lokal saat dijalankan.

## Fitur dan kontrol

- Cube, Sphere, dan Cylinder dengan material berwarna, cahaya hemisphere/directional, dan bayangan.
- Kamera perspektif: drag untuk orbit, scroll untuk zoom, klik kanan + drag untuk pan.
- Klik mesh atau hierarchy untuk memilih objek.
- Gizmo **Move / Rotate / Scale**, inspector Position/Rotation/Scale XYZ, dan tombol Fokus.
- Duplikasi dan hapus objek.
- Play/Stop: simulasi gravitasi pada sumbu Y dan gerakan Player pada bidang X/Z memakai WASD atau panah. Stop mengembalikan scene sebelum Play.
- Simpan scene ke browser; ekspor/impor JSON untuk backup dan berbagi.

Scene demo memuat Ground, Player, dan Sphere. Pilih Player lalu Play untuk mencoba gerakan. Edit scene dinonaktifkan selama Play.

## Baru di versi 0.5

### File, folder, dan script

Panel **Project Files** berada di bawah viewport. Isi **Nama baru**, lalu pilih **+ Folder** atau **+ File**. Klik folder untuk menentukan tujuan, dan klik file untuk membuka isinya di editor teks. **Simpan File** atau Ctrl+S saat editor teks aktif menyimpan isi file.

- **Buka Folder Disk** pada aplikasi desktop memakai pemilih folder sistem. Pembuatan file/folder dan penyimpanan teks langsung bekerja pada folder yang dipilih. File yang sudah ada tidak ditimpa saat membuat file baru. Perubahan dari editor lain diperiksa sebelum menyimpan.
- Tanpa folder disk, file disimpan sebagai **Proyek Lokal** pada profil aplikasi/browser. Gunakan **Ekspor Proyek** untuk backup JSON yang memuat file teks, scene aktif, dan pengaturan loading screen. **Impor Proyek** membuka backup sebagai proyek lokal tanpa menulis ke folder disk.
- **Tambah File** menyalin file teks yang dipilih ke folder aktif. Batas editor 1 MB per file UTF-8; file biner, path traversal, metadata tersembunyi, dan symlink tidak dibuka. Daftar folder dibatasi 2000 entri / kedalaman 8.
- Script `.js`, `.json`, `.txt`, atau teks lain dapat diedit, tetapi **belum dijalankan sebagai komponen game**. Tidak ada akses Node.js langsung dari script pengguna.
- Scene tetap tersimpan pada profil aplikasi melalui **Simpan**; pilih **Ekspor Proyek** untuk membawanya bersama file ke perangkat lain. Folder disk perlu dipilih kembali saat membuka aplikasi berikutnya.

### Logo, tema, dan loading screen

Tema editor menjadi hitam dengan aksen cyan. Logo putih-biru diadaptasi dari referensi pemilik proyek dan dipakai pada ikon installer Windows/Linux, jendela aplikasi, header, serta loading screen. Berkas logo berada di `assets/ravs-logo.png`; ikon packaging berada di `build/icon.png`.

Atur **Judul game** dan **Durasi minimum** pada panel Loading Screen, lalu klik **Pratinjau Loading**. Logo dan nama **Ravs** muncul saat aplikasi dibuka dan sebelum Play. **Ekspor Game HTML** menghasilkan satu file `game-ravs.html` yang berisi renderer, scene, logo, dan loading screen; game ini dapat dibuka dengan browser WebGL 2 tanpa CDN. Pergerakan WASD/panah dan simulasi bawaan ikut diekspor, tetapi script proyek belum dijalankan. Ini belum mengekspor game menjadi EXE.

**Memperbarui aplikasi:** tutup versi lama lalu instal versi 0.5.0 dari Releases. Aplikasi belum memiliki auto-update. Mengubah source/logo di GitHub tidak mengganti installer versi lama; gunakan installer baru. Backup scene/proyek sebelum memperbarui.

## Fitur dari versi 0.4

- **Undo/Redo** hingga 100 transaksi untuk tambah/hapus/duplikasi, inspector, drag gizmo, pengaturan, impor, scene baru, dan demo. Satu drag menjadi satu transaksi; simulasi Play tidak masuk history. History tidak disimpan setelah aplikasi ditutup.
- **Scene Baru** membuat scene kosong; Undo dapat memulihkan scene sebelumnya.
- **Cari objek** berdasarkan nama di hierarchy; pencarian tidak mengubah scene.
- **Cylinder** sebagai primitive tambahan (collider tetap bounding box).
- **Snap transform**: perpindahan 0.5 unit, rotasi 15°, dan skala 0.25, berlaku saat memakai gizmo.
- **Latar dan grid** tersimpan bersama scene. File 3D versi 2 lama tetap bisa dibuka dengan pengaturan default.
- **Status belum disimpan** dan konfirmasi sebelum menutup/reload jika scene berubah. Simpan lokal tetap perlu ekspor JSON untuk backup antar-komputer.
- Menu Undo/Redo dan Simpan pada aplikasi desktop terhubung ke editor. Undo saat mengetik tetap berlaku pada teks.

| Shortcut | Fungsi |
| --- | --- |
| Ctrl/Cmd+Z | Undo scene (di luar kolom input) |
| Ctrl/Cmd+Shift+Z | Redo scene |
| Ctrl+Y | Redo (di luar kolom input) |
| Ctrl/Cmd+S | Simpan scene lokal |
| Ctrl/Cmd+D | Duplikat objek terpilih |
| Delete | Hapus objek terpilih |
| W / E / R | Move / Rotate / Scale saat Edit |
| F | Fokus kamera ke objek terpilih |

WASD saat Play tetap untuk menggerakkan Player. Kolom teks/angka mempertahankan shortcut pengetikan normal.

## Format proyek

Scene 3D menggunakan `version: 2`. Setiap objek memiliki `position`, `rotation` (derajat), dan `scale` dengan sumbu X/Y/Z; serta komponen `body` dan `motion`. Impor memvalidasi format sebelum mengganti scene aktif.

Penyimpanan memakai key baru `ravs.scene.3d.v2` sehingga data 2D lama tidak tertimpa. Scene JSON versi 1 (2D) ditolak dengan pesan; belum tersedia konverter otomatis.

Electron 45+ memerlukan instalasi runtime eksplisit. `npm run desktop` dan `npm run test:desktop` menjalankan `npm run setup:desktop` secara otomatis; perintah itu aman dijalankan ulang dan mempertahankan verifikasi checksum.

## Membuat installer

```sh
npm ci
npm run dist:linux  # AppImage dan .deb ke dist/
npm run dist:win    # Installer Windows .exe ke dist/
```

Build Windows dijalankan pada Windows; workflow rilis sudah menggunakan runner Windows khusus. Cross-build installer Windows dari Linux belum berhasil di lingkungan ini karena dependensi Wine. `npm run pack` membuat folder aplikasi tanpa installer. Node.js dan alat build hanya diperlukan pengembang.

Workflow `.github/workflows/desktop-release.yml` membangun installer pada runner Windows dan Linux. Pull request menjalankan build, dan **Actions → Desktop installers → Run workflow** menyediakan artefak build manual. Push tag versi untuk membuat GitHub Release beserta installer dan `SHA256SUMS.txt` secara otomatis:

```sh
git tag v0.5.0
git push origin v0.5.0
```

Untuk rilis berikutnya, perbarui versi `package.json` beserta lockfile dan gunakan tag yang sesuai. Rilis belum tersedia sampai kedua build dan job publikasi berhasil. Jangan commit `dist/` atau executable ke source Git.

## Pengujian

```sh
npm test
npm run test:desktop
npx playwright install chromium
npm run test:browser
```

Jika Chromium sudah tersedia, gunakan `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`. Tes browser memulai server sendiri pada port 3100 dan memeriksa WebGL, tambah/duplikasi/hapus, inspector, mode transform, simpan/muat, impor/ekspor, dan pemulihan setelah Stop. Tes model memeriksa serialisasi, validasi, gravitasi, batas platform X/Z, dan gerakan diagonal.

Tes desktop membuka Electron langsung melalui file lokal, memeriksa WebGL, isolasi Node.js dari renderer, simpan/muat, dan Play/Stop. Pada Linux tanpa layar, tes memakai mode headless; konfigurasi aplikasi normal tetap memakai sandbox. Gunakan `DESKTOP_EXECUTABLE=/path/ke/ravs-engine npm run test:desktop` untuk menguji hasil packaging Linux.

## Struktur

- `src/scene.js`: model, serialisasi tervalidasi, dan simulasi 3D.
- `src/viewport.js`: renderer Three.js, kamera orbit, raycasting, gizmo, dan pencahayaan.
- `src/editor.js`: hierarchy, inspector, kontrol Play, dan penyimpanan proyek.
- `desktop/main.cjs`: aplikasi Electron, jendela, menu, dan dialog ekspor.
- `electron-builder.yml`: konfigurasi installer Windows/Linux.
- `assets/ravs-logo.png` dan `build/icon.png`: logo Ravs dan ikon aplikasi.
- `src/project-panel.js` dan `src/project.js`: file explorer, editor teks, serta proyek lokal.
- `desktop/project-store.cjs`: akses file terbatas pada folder yang dipilih.
- `src/player.js` dan `src/game-export.js`: player mandiri dan ekspor game HTML.
- `scripts/build.cjs`: bundling editor, player, dan logo.
- `server.js`: server pengembangan browser.
- `tests/`: tes model dan tes browser.

## Batasan versi awal

Ini fondasi engine 3D, belum setara Unity. Fisika memakai ukuran box tanpa rotasi untuk landing vertikal terhadap objek statis; Sphere juga memakai collider box. Belum ada tumbukan samping, tumbukan antar-rigidbody, collider yang mengikuti rotasi, impor model/aset, scripting C#, audio, animasi, atau ekspor game sebagai executable terpisah. Installer berisi aplikasi editor 3D. Ekspor HTML tersedia untuk scene dan komponen bawaan; build game native serta eksekusi script pengguna belum tersedia. Server ditujukan untuk pengembangan, bukan deployment produksi.
