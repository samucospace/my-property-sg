import { dbAll, dbGet } from './db.js';

// Haversine distance in kilometers
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 1. Search Autocomplete Suggestions
export async function getSearchSuggestions(q) {
  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return { projects: [], streets: [], districts: [], planningAreas: [] };
  }

  const term = `%${q.trim().toUpperCase()}%`;

  const projects = await dbAll(
    `SELECT project_id as id, project_name as name, street_name as street, postal_district as district, planning_area as planningArea
     FROM projects
     WHERE UPPER(project_name) LIKE ? OR UPPER(street_name) LIKE ?
     LIMIT 10`,
    [term, term]
  );

  const streetsRows = await dbAll(
    `SELECT DISTINCT street_name FROM projects WHERE UPPER(street_name) LIKE ? LIMIT 5`,
    [term]
  );

  const districtRows = await dbAll(
    `SELECT DISTINCT postal_district FROM projects WHERE postal_district LIKE ? LIMIT 5`,
    [`%${q.trim()}%`]
  );

  const planningRows = await dbAll(
    `SELECT DISTINCT planning_area FROM projects WHERE UPPER(planning_area) LIKE ? LIMIT 5`,
    [term]
  );

  return {
    projects,
    streets: streetsRows.map(r => r.street_name),
    districts: districtRows.map(r => r.postal_district),
    planningAreas: planningRows.map(r => r.planning_area).filter(Boolean)
  };
}

// 2. Price Analytics & Filter Query Engine
export async function getPriceAnalytics(filters = {}) {
  const {
    projects = [],
    street = null,
    district = null,
    planningArea = null,
    radiusKm = null,
    centerCoords = null,
    dateFrom = '2021-01-01',
    dateTo = '2026-12-31',
    unitSizeMin = 0,
    unitSizeMax = 10000,
    unitType = 'sqm'
  } = filters;

  // Calculate size in SQM for SQL filtering
  const sizeMinSqm = unitType === 'sqft' ? unitSizeMin / 10.7639 : unitSizeMin;
  const sizeMaxSqm = unitType === 'sqft' ? unitSizeMax / 10.7639 : unitSizeMax;

  let whereClauses = ['t.contract_date >= ? AND t.contract_date <= ?', 't.area_sqm >= ? AND t.area_sqm <= ?'];
  let params = [dateFrom, dateTo, sizeMinSqm, sizeMaxSqm];

  // Specific project names
  if (Array.isArray(projects) && projects.length > 0) {
    const placeholders = projects.map(() => '?').join(',');
    whereClauses.push(`p.project_name IN (${placeholders})`);
    params.push(...projects);
  }

  // Street filter
  if (street) {
    whereClauses.push(`UPPER(p.street_name) = UPPER(?)`);
    params.push(street);
  }

  // District filter
  if (district) {
    whereClauses.push(`p.postal_district = ?`);
    params.push(String(district).padStart(2, '0'));
  }

  // Planning area filter
  if (planningArea) {
    whereClauses.push(`UPPER(p.planning_area) = UPPER(?)`);
    params.push(planningArea);
  }

  const sqlWhere = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  // Retrieve raw transaction entries joined with project lat/lng
  const rawTx = await dbAll(
    `SELECT t.transaction_id, t.contract_date, t.price_sgd, t.area_sqm, t.area_sqft, t.psqm_sgd, t.psft_sgd, t.floor_range, t.type_of_sale, t.tenure,
            p.project_id, p.project_name, p.street_name, p.postal_district, p.planning_area, p.market_segment, p.latitude, p.longitude
     FROM property_transactions t
     JOIN projects p ON t.project_id = p.project_id
     ${sqlWhere}
     ORDER BY t.contract_date ASC`,
    params
  );

  // Apply Haversine radius filter if specified
  let filteredTx = rawTx;
  if (radiusKm && centerCoords && centerCoords.lat && centerCoords.lng) {
    const lat = parseFloat(centerCoords.lat);
    const lng = parseFloat(centerCoords.lng);
    const maxRadius = parseFloat(radiusKm);

    filteredTx = rawTx.filter(tx => {
      if (!tx.latitude || !tx.longitude) return false;
      const dist = haversineDistance(lat, lng, tx.latitude, tx.longitude);
      return dist <= maxRadius;
    });
  }

  // Compute Metrics Summary Cards
  let summary = {
    totalVolume: filteredTx.length,
    medianPrice: 0,
    medianPsqm: 0,
    medianPsft: 0,
    minPrice: 0,
    maxPrice: 0,
    averagePrice: 0
  };

  if (filteredTx.length > 0) {
    const sortedPrices = [...filteredTx].map(t => t.price_sgd).sort((a, b) => a - b);
    const sortedPsqm = [...filteredTx].map(t => t.psqm_sgd).sort((a, b) => a - b);
    const sortedPsft = [...filteredTx].map(t => t.psft_sgd).sort((a, b) => a - b);

    const mid = Math.floor(sortedPrices.length / 2);
    summary.medianPrice = sortedPrices.length % 2 !== 0 ? sortedPrices[mid] : (sortedPrices[mid - 1] + sortedPrices[mid]) / 2;
    summary.medianPsqm = sortedPsqm.length % 2 !== 0 ? sortedPsqm[mid] : (sortedPsqm[mid - 1] + sortedPsqm[mid]) / 2;
    summary.medianPsft = sortedPsft.length % 2 !== 0 ? sortedPsft[mid] : (sortedPsft[mid - 1] + sortedPsft[mid]) / 2;
    summary.minPrice = sortedPrices[0];
    summary.maxPrice = sortedPrices[sortedPrices.length - 1];
    summary.averagePrice = sortedPrices.reduce((sum, p) => sum + p, 0) / sortedPrices.length;
  }

  // Time-series trend grouping (Monthly)
  const monthlyMap = new Map();
  filteredTx.forEach(tx => {
    // contract_date format: YYYY-MM-01 -> month key YYYY-MM
    const monthKey = tx.contract_date.substring(0, 7);
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { month: monthKey, psqmList: [], psftList: [], priceList: [] });
    }
    const item = monthlyMap.get(monthKey);
    item.psqmList.push(tx.psqm_sgd);
    item.psftList.push(tx.psft_sgd);
    item.priceList.push(tx.price_sgd);
  });

  const timeSeries = Array.from(monthlyMap.entries()).map(([mKey, data]) => {
    const sPsqm = [...data.psqmList].sort((a, b) => a - b);
    const sPsft = [...data.psftList].sort((a, b) => a - b);
    const sPrice = [...data.priceList].sort((a, b) => a - b);
    const mid = Math.floor(sPsqm.length / 2);

    return {
      period: mKey,
      volume: data.psqmList.length,
      medianPsqm: Math.round(sPsqm.length % 2 !== 0 ? sPsqm[mid] : (sPsqm[mid - 1] + sPsqm[mid]) / 2),
      avgPsqm: Math.round(sPsqm.reduce((a, b) => a + b, 0) / sPsqm.length),
      medianPsft: Math.round(sPsft.length % 2 !== 0 ? sPsft[mid] : (sPsft[mid - 1] + sPsft[mid]) / 2),
      avgPsft: Math.round(sPsft.reduce((a, b) => a + b, 0) / sPsft.length),
      medianPrice: Math.round(sPrice.length % 2 !== 0 ? sPrice[mid] : (sPrice[mid - 1] + sPrice[mid]) / 2)
    };
  }).sort((a, b) => a.period.localeCompare(b.period));

  // Floor tier scatter plot points (sampled max 200 points for chart performance)
  const scatterPoints = filteredTx.slice(-200).map(t => ({
    id: t.transaction_id,
    date: t.contract_date,
    floorRange: t.floor_range || 'Unknown',
    priceSgd: t.price_sgd,
    psqm: Math.round(t.psqm_sgd),
    psft: Math.round(t.psft_sgd),
    areaSqm: t.area_sqm,
    areaSqft: Math.round(t.area_sqft),
    projectName: t.project_name,
    typeOfSale: t.type_of_sale
  }));

  // Distinct Developments for Map display
  const mapProjectsMap = new Map();
  filteredTx.forEach(t => {
    if (!mapProjectsMap.has(t.project_id)) {
      mapProjectsMap.set(t.project_id, {
        id: t.project_id,
        name: t.project_name,
        street: t.street_name,
        district: t.postal_district,
        planningArea: t.planning_area,
        segment: t.market_segment,
        lat: t.latitude,
        lng: t.longitude,
        psqmList: [],
        psftList: []
      });
    }
    const item = mapProjectsMap.get(t.project_id);
    item.psqmList.push(t.psqm_sgd);
    item.psftList.push(t.psft_sgd);
  });

  const mapProjects = Array.from(mapProjectsMap.values()).map(p => {
    const sPsqm = [...p.psqmList].sort((a, b) => a - b);
    const sPsft = [...p.psftList].sort((a, b) => a - b);
    const mid = Math.floor(sPsqm.length / 2);
    return {
      id: p.id,
      name: p.name,
      street: p.street,
      district: p.district,
      planningArea: p.planningArea,
      segment: p.segment,
      lat: p.lat,
      lng: p.lng,
      txCount: p.psqmList.length,
      medianPsqm: Math.round(sPsqm.length % 2 !== 0 ? sPsqm[mid] : (sPsqm[mid - 1] + sPsqm[mid]) / 2),
      medianPsft: Math.round(sPsft.length % 2 !== 0 ? sPsft[mid] : (sPsft[mid - 1] + sPsft[mid]) / 2)
    };
  });

  return {
    summary,
    timeSeries,
    scatterPoints,
    mapProjects
  };
}

// 3. Get all projects overview for map initialize
export async function getAllProjects() {
  const projects = await dbAll(
    `SELECT p.project_id as id, p.project_name as name, p.street_name as street, p.postal_district as district,
            p.market_segment as segment, p.planning_area as planningArea, p.latitude as lat, p.longitude as lng,
            COUNT(t.transaction_id) as txCount,
            ROUND(AVG(t.psqm_sgd)) as avgPsqm,
            ROUND(AVG(t.psft_sgd)) as avgPsft
     FROM projects p
     LEFT JOIN property_transactions t ON p.project_id = t.project_id
     GROUP BY p.project_id`
  );
  return projects;
}
