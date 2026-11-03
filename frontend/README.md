# CoopLedger — Frontend

Angular 20 (standalone components, Signals, Reactive Forms). UI untuk sistem
koperasi simpan pinjam CoopLedger; backend ada di `../backend`.

Untuk cara menjalankan, fitur, akun demo, dan arsitektur, lihat
[root README](../README.md).

## Run in development (hot reload)

```bash
docker compose stop frontend   # container UI juga memakai port 4200
npm install
npm start                      # http://localhost:4200, proxy /api ke :8080
```

## Build

```bash
npm run build                  # output di dist/frontend/browser
```

Image produksi dibangun oleh `frontend/Dockerfile` (nginx menyajikan bundle dan
meneruskan `/api` ke container backend).
