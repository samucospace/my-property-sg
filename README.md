# Singapore Private Property Valuation & Analytics Portal (`my-property-SG`)

An interactive web application that ingests Singapore private residential transaction data via the **URA Data Service API**, normalizes historical transactions in a local SQLite database, and provides a real-time analytics dashboard for property owners, buyers, and investors.

---

## Key Features

- **Live URA API Data Sync**: Automated token exchange with URA's API Gateway (`eservice.ura.gov.sg`) and multi-batch ingestion (`batches 1–4`) with deterministic MD5 payload deduplication.
- **Zero-Latency SVY21 Spatial Converter**: Mathematical conversion of Singapore SVY21 coordinates to WGS84 (Lat/Lng) in 0ms without external API rate limits.
- **Interactive GIS Development Map**: Built with Leaflet & OpenStreetMap, featuring color-coded markers for developments (CCR, RCR, OCR) and interactive map click radius filtering.
- **Valuation & Floor Tier Analytics**: Dual-axis Recharts time-series ($/sqm or $/sqft rate vs transaction volume) and floor-tier scatter plot analysis.
- **Unified Autocomplete Filter**: Fast search bar supporting mixed queries across developments, street names, postal districts, and planning areas.
- **Offline / Demo Mode**: Pre-loaded mock generator yielding realistic 5-year Singapore property data out of the box.

---

## Tech Stack

- **Backend**: Node.js, Express, SQLite (`sqlite3`), Axios.
- **Frontend**: React 18, Vite, Recharts, Leaflet (`react-leaflet`), Lucide Icons.

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

#### Terminal 2: Start Frontend Vite Dev Server (Port 3000)
```bash
cd client
npm run dev
```
*Output: `VITE ready in ... ms -> Local: http://localhost:3000/`*

---

### Step 3: Open in Browser

Open [http://localhost:3000/](http://localhost:3000/) in your web browser.

---

## Live URA API Ingestion

1. Click **Sync URA API Data** in the top-right header of the web app.
2. Enter your static **URA Access Key** obtained from the [URA Developer Portal](https://eservice.ura.gov.sg/maps/api/#authentication).
3. Click **Run Live URA API Ingestion**.
4. The system will retrieve today's daily token and populate historical transactions into your local database.

---

## API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/search/suggestions?q=...` | Autocomplete search for projects, streets, districts, and planning areas |
| `POST` | `/api/analytics/price-trends` | Aggregates price trends ($/sqm, $/sqft), scatter points, and spatial map markers |
| `GET` | `/api/projects` | Overview list of all registered developments |
| `POST` | `/api/ingest/ura` | Body: `{ "accessKey": "YOUR_KEY" }` — Triggers live URA token exchange & batch 1–4 download |
| `POST` | `/api/ingest/seed` | Re-seeds database with realistic Singapore property demo dataset |

---

## License

MIT License. Built for Singapore private residential property market analysis.
