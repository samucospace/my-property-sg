# Singapore Private Property Valuation & Analytics Portal (`my-property-SG`)

An interactive web application that ingests Singapore private residential transaction and rental data via the **URA Data Service API**, converts spatial coordinates via a zero-latency in-memory SVY21 mathematical engine, normalizes historical transactions in a local SQLite database, and delivers a real-time valuation, rental yield, and livability analytics dashboard.

---

## 🚀 Instant Demo & Offline Mode (No API Key Required)

**You do NOT need a paid or official URA Data Service API key to run and evaluate this project.**

The repository includes a built-in **Offline / Mock Data Generator**:
- **Automatic Initialization**: On first launch, if the local SQLite database is empty, the backend automatically seeds 10 representative prime Singapore condominium developments across Core Central Region (CCR), Rest of Central Region (RCR), and Outside Central Region (OCR) with 5 years of historical transaction caveats (2021–2026), realistic tenancy rental contracts, monthly SORA interest benchmark rates, and spatial MRT/school amenities.
- **Instant UI Exploration**: You can immediately search developments, filter by district/region, examine price trends, compare rental yields, inspect floor-tier scatter plots, and explore GIS map markers.
- **One-Click Re-seeding**: You can re-seed or reset the demo dataset at any time via the **Sync URA API Data** modal (Option 1: Offline Demo Data) or by calling `POST /api/ingest/seed`.

---

## Key Features

- **Instant Offline Demo Generator**: Realistic 5-year Singapore property sales caveats, rental yields, and benchmark interest rates out of the box.
- **Live URA API Data Sync**: Automated daily token exchange with URA's API Gateway (`eservice.ura.gov.sg`), multi-batch sales ingestion (`batches 1–4`), and quarterly rental contract synchronization with deterministic MD5 payload deduplication.
- **Zero-Latency SVY21 Spatial Converter**: Pure mathematical conversion of Singapore Transverse Mercator (SVY21) coordinates to WGS84 (Lat/Lng) in 0ms without external API dependencies or rate limits.
- **Interactive GIS Development Map**: Leaflet map featuring color-coded development markers (CCR, RCR, OCR), dynamic map click radius filtering, and interactive popups with key valuation metrics.
- **Valuation & Floor Tier Analytics**: Dual-axis Recharts time-series ($/sqm or $/sqft rate vs transaction volume) and floor-tier scatter plot analysis.
- **Rental Yield & Tenancy Engine**: Compares gross rental yields against 1M & 3M compounded SORA historical benchmarks across bedroom configurations (1-bedder to 4-bedder).
- **Amenities & Livability Scoring**: Calculates walking distance and density scores to nearest MRT stations, primary schools, supermarkets, and parks.
- **Unified Autocomplete Filter**: Fast multi-attribute search across project names, street names, postal districts, and planning areas.

---

## Tech Stack

- **Backend**: Node.js (ES Modules), Express, SQLite (`sqlite3`), Axios.
- **Frontend**: React 18, Vite, Recharts, Leaflet (`react-leaflet`), Lucide Icons.
- **GIS / Math**: Native SVY21 (Singapore Transverse Mercator) to WGS84 projection algorithm.

---

## Getting Started (Terminal Guide)

### Prerequisites

Make sure you have **Node.js (v18 or higher)** and **npm** installed:
```bash
node -v
npm -v
```

---

### Step 1: Install Dependencies

From the repository root directory (`my-property-SG`), install dependencies for both server and client:

```bash
# 1. Install Backend Dependencies
cd server
npm install

# 2. Install Frontend Dependencies
cd ../client
npm install
```

---

### Step 2: Launch Backend & Frontend Servers

Open two terminal windows (or run commands from separate shells):

#### Terminal 1: Start Backend Express Server (Port 3001)
```bash
cd server
npm start
```
*Output: `Backend server running on http://localhost:3001`*  
*(The database automatically initializes and populates the demo dataset if empty).*

#### Terminal 2: Start Frontend Vite Dev Server (Port 3000)
```bash
cd client
npm run dev
```
*Output: `VITE ready in ... ms -> Local: http://localhost:3000/`*

---

### Step 3: Open in Browser

Open [http://localhost:3000/](http://localhost:3000/) in your web browser. The dashboard will load with pre-populated property data ready for analysis.

---

## Data Synchronization Modes

Click **Sync URA API Data** in the top-right header of the web app to choose between three modes:

1. **Option 1: Offline Demo Data (Default / Immediate)**
   - Click **Generate / Reset Offline Demo Dataset** to populate realistic multi-year Singapore property data without needing any credentials.
2. **Option 2: Live URA API Key**
   - Provide your static **URA Access Key** obtained from the [URA Developer Portal](https://eservice.ura.gov.sg/maps/api/#authentication). The server handles daily token retrieval and pulls live sales batches and rental quarters.
3. **Option 3: Import Data File**
   - Upload or paste exported URA JSON payload files directly to parse and persist real caveats into your local database.

---

## API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check and server status |
| `GET` | `/api/search/suggestions?q=...` | Autocomplete search for projects, streets, districts, and planning areas |
| `POST` | `/api/analytics/price-trends` | Aggregates price trends ($/sqm, $/sqft), scatter points, and spatial map markers |
| `POST` | `/api/analytics/rental-yields` | Aggregates rental prices, gross rental yields, and SORA rate comparisons |
| `GET` | `/api/projects` | Overview list of all registered developments |
| `GET` | `/api/projects/:id/livability` | Computes project livability score and nearby amenity breakdown |
| `GET` | `/api/amenities` | Retrieves GIS POIs (MRT stations, schools, supermarkets, parks) |
| `POST` | `/api/ingest/seed` | Generates / re-seeds database with realistic Singapore property demo dataset |
| `POST` | `/api/ingest/ura` | Body: `{ "accessKey": "YOUR_KEY" }` — Live URA token exchange & batch download |
| `POST` | `/api/ingest/import-data` | Body: `{ "jsonData": [...] }` — Imports raw URA transaction & rental JSON export |

---

## License

This project is open-source under the [MIT License](LICENSE). Copyright (c) 2026 samucospace.
