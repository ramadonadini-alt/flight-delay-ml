# Flight Risk Prediction System

Website FastAPI untuk menampilkan estimasi risiko pembatalan penerbangan dari model Machine Learning yang tersedia. Aplikasi tidak menggunakan database: riwayat prediksi disimpan di browser melalui LocalStorage, sedangkan analytics membaca CSV lokal.

## Struktur penting

```text
backend/                 FastAPI routes, schemas, dan services
dataset/                 Dataset CSV untuk analytics
model/                   File JOBLIB yang tersedia
evaluation/              JSON metrik model jika tersedia
static/                  Dashboard dan halaman web
```

## Model tersedia

- `model/model_flight_cancellation.joblib`: tersedia dan digunakan oleh endpoint prediksi cancellation.

Model cancellation memakai 23 fitur. Form menghitung `days_before_departure`, `flight_day`, dan `season` dari tanggal pemesanan serta tanggal keberangkatan sebelum data dikirim ke pipeline.

## Menjalankan

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app:app --reload
```

Buka `http://127.0.0.1:8000`. Dokumentasi API tersedia di `http://127.0.0.1:8000/docs`.

## Halaman web

- `/` — Dashboard LocalStorage
- `/prediction.html` — Form prediksi
- `/result.html` — Hasil prediksi
- `/history.html` — Riwayat dan ekspor Excel
- `/analytics.html` — Analisis dataset CSV

## Endpoint API

- `GET /api/health`
- `POST /api/predict`
- `POST /api/predict/cancellation`
- `GET /api/analytics`
- `GET /api/analytics/airlines`
- `GET /api/analytics/routes`
- `GET /api/analytics/route-details?origin=CGK&destination=DPS` — Referensi median jarak dan durasi rute dari CSV

Probabilitas model adalah estimasi berbasis data dan tidak menjamin status penerbangan nyata.
