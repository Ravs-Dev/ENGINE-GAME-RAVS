# RAVS Engine 3D

Editor game **3D berbasis browser** menggunakan Three.js dan WebGL 2. Versi 0.2 mengganti editor 2D sebelumnya dengan scene 3D, kamera perspektif, mesh, pencahayaan, dan transform XYZ.

## Menjalankan

Butuh Node.js 22+ dan browser dengan WebGL 2.

```sh
npm ci
npm start
```

Buka `http://localhost:3000` pada browser lokal. Gunakan `PORT=4000 npm start` untuk port lain. Three.js dilayani dari dependency lokal, sehingga editor tidak membutuhkan CDN saat dijalankan.

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

## Pengujian

```sh
npm test
npx playwright install chromium
npm run test:browser
```

Jika Chromium sudah tersedia, gunakan `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`. Tes browser memulai server sendiri pada port 3100 dan memeriksa WebGL, tambah/duplikasi/hapus, inspector, mode transform, simpan/muat, impor/ekspor, dan pemulihan setelah Stop. Tes model memeriksa serialisasi, validasi, gravitasi, batas platform X/Z, dan gerakan diagonal.

## Struktur

- `src/scene.js`: model, serialisasi tervalidasi, dan simulasi 3D.
- `src/viewport.js`: renderer Three.js, kamera orbit, raycasting, gizmo, dan pencahayaan.
- `src/editor.js`: hierarchy, inspector, kontrol Play, dan penyimpanan proyek.
- `server.js`: server pengembangan.
- `tests/`: tes model dan tes browser.

## Batasan versi awal

Ini fondasi engine 3D, belum setara Unity. Fisika memakai ukuran box tanpa rotasi untuk landing vertikal terhadap objek statis; Sphere juga memakai collider box. Belum ada tumbukan samping, tumbukan antar-rigidbody, collider yang mengikuti rotasi, undo/redo, impor model/aset, scripting C#, audio, animasi, atau build native. Server ditujukan untuk pengembangan, bukan deployment produksi.
