import express from 'express';
import cors from 'cors';
import { initDb, dbGet } from './db.js';
import { seedMockData, fetchUraData, seedSoraRates } from './ingestion.js';
import { getSearchSuggestions, getPriceAnalytics, getAllProjects } from './queryEngine.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. Search Autocomplete
app.get('/api/search/suggestions', async (req, res) => {
  try {
    const q = req.query.q || '';
    const suggestions = await getSearchSuggestions(q);
    res.json(suggestions);
  } catch (err) {
    console.error('Error fetching suggestions:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Price Trends & Analytics Query
app.post('/api/analytics/price-trends', async (req, res) => {
  try {
    const filters = req.body.filters || {};
    const analytics = await getPriceAnalytics(filters);
    res.json(analytics);
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. All Projects overview
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await getAllProjects();
    res.json(projects);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Trigger Seed Dataset
app.post('/api/ingest/seed', async (req, res) => {
  try {
    const count = await seedMockData();
    res.json({ success: true, count });
  } catch (err) {
    console.error('Error seeding mock data:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Trigger Live URA Data Fetch
app.post('/api/ingest/ura', async (req, res) => {
  try {
    const { accessKey } = req.body;
    if (!accessKey) {
      return res.status(400).json({ error: 'AccessKey is required in request body.' });
    }
    const result = await fetchUraData(accessKey);
    res.json(result);
  } catch (err) {
    console.error('Error executing URA live fetch:', err);
    res.status(500).json({ error: err.message });
  }
});

// Startup logic
async function startServer() {
  await initDb();

  // Auto-seed database if empty
  const projectCount = await dbGet(`SELECT COUNT(*) as count FROM projects`);
  if (!projectCount || projectCount.count === 0) {
    console.log('Database empty. Automatically populating initial Singapore property dataset...');
    await seedMockData();
  }

  const soraCount = await dbGet(`SELECT COUNT(*) as count FROM sora_rates`);
  if (!soraCount || soraCount.count === 0) {
    console.log('SORA rate dataset empty. Seeding SORA rates...');
    await seedSoraRates();
  }

  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
