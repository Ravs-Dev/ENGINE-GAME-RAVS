# RAVS Engine 3D

Editor game **3D desktop untuk Windows dan Linux**, menggunakan Electron, Three.js, dan WebGL 2. Versi 0.3 menyediakan installer desktop; mode browser tetap tersedia untuk pengembangan. Pengguna aplikasi hasil build tidak perlu memasang Node.js atau menjalankan server.

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

- Cube dan Sphere dengan material berwarna, cahaya hemisphere/directional, dan bayangan.
- Kamera perspektif: drag untuk orbit, scroll untuk zoom, klik kanan + drag untuk pan.
- Klik mesh atau hierarchy untuk memilih objek.
- Gizmo **Move / Rotate / Scale**, inspector Position/Rotation/Scale XYZ, dan tombol Fokus.
- Duplikasi dan hapus objek.
- Play/Stop: simulasi gravitasi pada sumbu Y dan gerakan Player pada bidang X/Z memakai WASD atau panah. Stop mengembalikan scene sebelum Play.
- Simpan scene ke browser; ekspor/impor JSON untuk backup dan berbagi.

Scene demo memuat Ground, Player, dan Sphere. Pilih Player lalu Play untuk mencoba gerakan. Edit scene dinonaktifkan selama Play.

## Format proyek

Scene 3D menggunakan `version: 2`. Setiap objek memiliki `position`, `rotation` (derajat), dan `scale` dengan sumbu X/Y/Z; serta komponen `body` dan `motion`. Impor memvalidasi format sebelum mengganti scene aktif.

Penyimpanan memakai key baru `ravs.scene.3d.v2` sehingga data 2D lama tidak tertimpa. Scene JSON versi 1 (2D) ditolak dengan pesan; belum tersedia konverter otomatis.

## Membuat installer

```sh
npm ci
npm run dist:linux  # AppImage dan .deb ke dist/
npm run dist:win    # Installer Windows .exe ke dist/
```

Build Windows dijalankan pada Windows; workflow rilis sudah menggunakan runner Windows khusus. Cross-build installer Windows dari Linux belum berhasil di lingkungan ini karena dependensi Wine. `npm run pack` membuat folder aplikasi tanpa installer. Node.js dan alat build hanya diperlukan pengembang.

Workflow `.github/workflows/desktop-release.yml` membangun installer pada runner Windows dan Linux. Pull request menjalankan build, dan **Actions → Desktop installers → Run workflow** menyediakan artefak build manual. Push tag versi untuk membuat GitHub Release beserta installer dan `SHA256SUMS.txt` secara otomatis:

```sh
git tag v0.3.0
git push origin v0.3.0
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
- `build/icon.svg` dan `build/icon.png`: ikon aplikasi.
- `server.js`: server pengembangan browser.
- `tests/`: tes model dan tes browser.

## Batasan versi awal

Ini fondasi engine 3D, belum setara Unity. Fisika memakai ukuran box tanpa rotasi untuk landing vertikal terhadap objek statis; Sphere juga memakai collider box. Belum ada tumbukan samping, tumbukan antar-rigidbody, collider yang mengikuti rotasi, undo/redo, impor model/aset, scripting C#, audio, animasi, atau ekspor game sebagai executable terpisah. Installer saat ini berisi aplikasi editor 3D, bukan toolchain untuk membangun game pengguna. Server ditujukan untuk pengembangan, bukan deployment produksi.
