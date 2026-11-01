# RAVS Engine

Fondasi editor game **2D berbasis browser**, terinspirasi alur kerja Unity. Versi 0.1 ini belum setara Unity dan belum menyediakan engine 3D, scripting C#, atau build aplikasi native.

## Menjalankan

Butuh Node.js 20.11+ (disarankan Node.js 22 atau lebih baru). Tidak ada dependency eksternal.

```sh
npm start
```

Buka browser pada port 3000. Gunakan `PORT=4000 npm start` untuk port lain. Jalankan `npm test` untuk pengujian model scene dan simulasi.

## Fitur

- Scene viewport dengan grid, pemilihan objek, dan drag.
- Hierarchy serta inspector untuk nama, transform, warna, dan komponen.
- Objek Box dan Circle, duplikasi, serta hapus.
- Mode Play/Stop dengan pemulihan scene sebelum simulasi.
- Rigidbody sederhana: gravitasi, bounce, dan landing pada objek statis.
- Controller horizontal menggunakan A/D atau tombol panah.
- Simpan lokal di browser, ekspor/impor scene JSON tervalidasi.

Scene demo berisi Ground dan Player. Klik Play untuk simulasi. Simpan menyimpan scene pada browser saat ini; gunakan Ekspor JSON untuk backup atau berbagi. Impor mengganti scene aktif.

## Struktur

- `src/scene.js`: model scene, validasi serialisasi, dan simulasi.
- `src/editor.js`: interaksi editor dan renderer Canvas 2D.
- `server.js`: server pengembangan tanpa dependency.
- `tests/scene.test.js`: pengujian menggunakan Node test runner.

## Batasan dan pengembangan berikutnya

Fisika memakai pendekatan bounding box untuk landing vertikal; rotasi dan bentuk lingkaran hanya memengaruhi visual/pemilihan, bukan collider. Belum ada collision samping, undo/redo, asset pipeline, audio, animasi, scripting pengguna, atau packaging game. Server ini untuk pengembangan lokal, bukan deployment produksi. Tidak ada data atau aset pihak ketiga yang disertakan.
