import axios from 'axios';
import crypto from 'crypto';
import { dbRun, dbGet, dbAll } from './db.js';

// Helper: MD5 Hash for deterministic transaction deduplication
function generateTxHash(projName, dateStr, price, area, floorRange) {
  const raw = `${projName}|${dateStr}|${price}|${area}|${floorRange || ''}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

// 1. Precise SVY21 (Singapore Transverse Mercator) to WGS84 (Lat/Lng) Math Converter
function calcM(lat, a, e2, e4, e6) {
  return a * ((1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * lat -
              (3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * lat) +
              (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * lat) -
              (35 * e6 / 3072) * Math.sin(6 * lat));
}

export function svy21ToWgs84(N, E) {
  if (!N || !E || isNaN(N) || isNaN(E)) return null;

  const rad = Math.PI / 180;
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const oLat = 1.366666666666667 * rad;
  const oLon = 103.83333333333333 * rad;
  const oN = 38744.572;
  const oE = 28001.642;
  const k = 1.0;

  const b = a * (1 - f);
  const e2 = (a * a - b * b) / (a * a);
  const e4 = e2 * e2;
  const e6 = e4 * e2;

  const Mo = calcM(oLat, a, e2, e4, e6);
  const M = Mo + (N - oN) / k;
  const mu = M / (a * (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256));

  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 = mu + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu) +
    (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu) +
    (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);

  const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
  const T1 = tanPhi1 * tanPhi1;
  const C1 = (e2 / (1 - e2)) * cosPhi1 * cosPhi1;
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5);
  const D = (E - oE) / (N1 * k);

  const lat = phi1 - (N1 * tanPhi1 / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * (e2 / (1 - e2))) * D * D * D * D / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * (e2 / (1 - e2)) - 3 * C1 * C1) * D * D * D * D * D * D / 720);
  const lon = oLon + (D - (1 + 2 * T1 + C1) * D * D * D / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * (e2 / (1 - e2)) + 24 * T1 * T1) * D * D * D * D * D / 120) / cosPhi1;

  return {
    latitude: parseFloat((lat / rad).toFixed(6)),
    longitude: parseFloat((lon / rad).toFixed(6))
  };
}

// Postal District Center Coordinates Fallback Lookup
const districtCenters = {
  "01": { lat: 1.2801, lng: 103.8540, planningArea: "Downtown Core" },
  "02": { lat: 1.2764, lng: 103.8447, planningArea: "Tanjong Pagar" },
  "03": { lat: 1.2880, lng: 103.8200, planningArea: "Queenstown" },
  "04": { lat: 1.2655, lng: 103.8118, planningArea: "Bukit Merah" },
  "05": { lat: 1.2980, lng: 103.7650, planningArea: "Pasir Panjang" },
  "06": { lat: 1.2912, lng: 103.8436, planningArea: "Singapore River" },
  "07": { lat: 1.3000, lng: 103.8550, planningArea: "Rochor" },
  "08": { lat: 1.3120, lng: 103.8530, planningArea: "Little India" },
  "09": { lat: 1.3030, lng: 103.8340, planningArea: "Orchard" },
  "10": { lat: 1.3138, lng: 103.7824, planningArea: "Bukit Timah" },
  "11": { lat: 1.3180, lng: 103.8420, planningArea: "Novena" },
  "12": { lat: 1.3280, lng: 103.8520, planningArea: "Toa Payoh" },
  "13": { lat: 1.3350, lng: 103.8700, planningArea: "MacPherson" },
  "14": { lat: 1.3180, lng: 103.8920, planningArea: "Geylang" },
  "15": { lat: 1.2995, lng: 103.8996, planningArea: "Marine Parade" },
  "16": { lat: 1.3068, lng: 103.9372, planningArea: "Bedok" },
  "17": { lat: 1.3500, lng: 103.9700, planningArea: "Changi" },
  "18": { lat: 1.3732, lng: 103.9493, planningArea: "Pasir Ris" },
  "19": { lat: 1.3850, lng: 103.8950, planningArea: "Hougang" },
  "20": { lat: 1.3524, lng: 103.8415, planningArea: "Bishan" },
  "21": { lat: 1.3400, lng: 103.7700, planningArea: "Upper Bukit Timah" },
  "22": { lat: 1.3380, lng: 103.7050, planningArea: "Jurong" },
  "23": { lat: 1.3650, lng: 103.7450, planningArea: "Bukit Panjang" },
  "25": { lat: 1.4350, lng: 103.7860, planningArea: "Woodlands" },
  "27": { lat: 1.4250, lng: 103.8350, planningArea: "Yishun" }
};

// 2. Fetch live data from official URA API with SQLite TRANSACTION batching
export async function fetchUraData(accessKey) {
  if (!accessKey) {
    throw new Error('URA AccessKey is required for live ingestion.');
  }

  const cleanKey = accessKey.trim();
  console.log(`Requesting daily URA token...`);

  // Step A: Get Token
  const tokenUrl = 'https://eservice.ura.gov.sg/uraDataService/insertNewToken/v1';
  const tokenRes = await axios.get(tokenUrl, {
    headers: {
      AccessKey: cleanKey,
      'User-Agent': 'Mozilla/5.0'
    }
  });

  const body = tokenRes.data || {};
  if (body.Status === 'Error' || !body.Result) {
    throw new Error(`URA API Error: ${body.Message || 'Invalid Access Key. Please double check your URA Access Key.'}`);
  }

  const dailyToken = body.Result;
  console.log('Daily URA Token obtained successfully.');

  let totalIngested = 0;

  // Step B: Fetch batches 1 to 4 with fast transaction commit
  for (let batch = 1; batch <= 4; batch++) {
    console.log(`Fetching URA batch ${batch}/4...`);
    const dataUrl = `https://eservice.ura.gov.sg/uraDataService/invokeUraDS/v1?service=PMI_Resi_Transaction&batch=${batch}`;

    const batchRes = await axios.get(dataUrl, {
      headers: {
        AccessKey: cleanKey,
        Token: dailyToken,
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const batchBody = batchRes.data || {};
    const projectsData = batchBody.Result || [];

    if (!Array.isArray(projectsData)) continue;

    // Begin fast bulk transaction
    await dbRun('BEGIN TRANSACTION');

    try {
      for (const rawProj of projectsData) {
        const projName = (rawProj.project || 'Unknown Project').trim().toUpperCase();
        const street = (rawProj.street || 'Singapore').trim();
        const district = String(rawProj.marketSegment || rawProj.district || '00').padStart(2, '0');
        const segment = rawProj.marketSegment || 'OCR';

        // Ensure project exists
        let projRecord = await dbGet(`SELECT project_id FROM projects WHERE project_name = ?`, [projName]);
        let projId;

        if (!projRecord) {
          let geo = null;
          if (rawProj.x && rawProj.y) {
            geo = svy21ToWgs84(parseFloat(rawProj.y), parseFloat(rawProj.x));
          }

          const fallback = districtCenters[district] || { lat: 1.3521, lng: 103.8198, planningArea: 'Central' };
          const lat = geo ? geo.latitude : fallback.lat;
          const lng = geo ? geo.longitude : fallback.lng;
          const planningArea = fallback.planningArea;
          
          const insertRes = await dbRun(
            `INSERT INTO projects (project_name, street_name, postal_district, market_segment, planning_area, latitude, longitude)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [projName, street, district, segment, planningArea, lat, lng]
          );
          projId = insertRes.lastID;
        } else {
          projId = projRecord.project_id;
        }

        // Process transactions list
        const txList = rawProj.transaction || [];
        for (const tx of txList) {
          const rawDate = tx.contractDate || '0124';
          const mm = rawDate.substring(0, 2);
          const yy = '20' + rawDate.substring(2, 4);
          const contractDate = `${yy}-${mm}-01`;

          const areaSqm = parseFloat(tx.area) || 0;
          if (areaSqm <= 0) continue;

          const areaSqft = areaSqm * 10.7639;
          const priceSgd = parseFloat(tx.price) || 0;
          const psqmSgd = priceSgd / areaSqm;
          const psftSgd = priceSgd / areaSqft;
          const floorRange = tx.floorRange || 'Unspecified';
          const tenure = tx.tenure || 'Freehold';
          const typeOfSale = tx.typeOfSale === '1' ? 'New Sale' : tx.typeOfSale === '2' ? 'Sub Sale' : 'Resale';
          const propertyType = tx.propertyType || 'Condominium';

          const rawHash = generateTxHash(projName, contractDate, priceSgd, areaSqm, floorRange);

          try {
            await dbRun(
              `INSERT INTO property_transactions 
               (project_id, area_sqm, area_sqft, price_sgd, psqm_sgd, psft_sgd, contract_date, floor_range, tenure, type_of_sale, property_type, raw_hash)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [projId, areaSqm, areaSqft, priceSgd, psqmSgd, psftSgd, contractDate, floorRange, tenure, typeOfSale, propertyType, rawHash]
            );
            totalIngested++;
          } catch (e) {
            // Ignore duplicate raw_hash violations
          }
        }
      }

      await dbRun('COMMIT');
      console.log(`Batch ${batch}/4 committed to database. Current total: ${totalIngested} caveats.`);
    } catch (txErr) {
      await dbRun('ROLLBACK');
      console.error(`Batch ${batch} rollback error:`, txErr.message);
    }
  }

  return { status: 'success', totalIngested };
}

// 3. Realistic Mock Seed Generator for Instant Demo
export async function seedMockData() {
  console.log('Seeding realistic Singapore property dataset for instant demo...');

  const mockDevelopments = [
    {
      name: "REFLECTIONS AT KEPPEL BAY",
      street: "Keppel Bay View",
      district: "04",
      segment: "CCR",
      planningArea: "Bukit Merah",
      lat: 1.2655,
      lng: 103.8118,
      basePsqm: 19500,
      tenure: "99 yrs leasehold",
      sizes: [78, 115, 145, 210]
    },
    {
      name: "THE INTERLACE",
      street: "Depot Road",
      district: "04",
      segment: "RCR",
      planningArea: "Bukit Merah",
      lat: 1.2824,
      lng: 103.8037,
      basePsqm: 14800,
      tenure: "99 yrs leasehold",
      sizes: [75, 108, 156, 198]
    },
    {
      name: "MARINA BAY RESIDENCES",
      street: "Marina Boulevard",
      district: "01",
      segment: "CCR",
      planningArea: "Downtown Core",
      lat: 1.2801,
      lng: 103.8540,
      basePsqm: 24500,
      tenure: "99 yrs leasehold",
      sizes: [66, 105, 162, 220]
    },
    {
      name: "D'LEEDON",
      street: "Leedon Heights",
      district: "10",
      segment: "CCR",
      planningArea: "Bukit Timah",
      lat: 1.3138,
      lng: 103.7824,
      basePsqm: 17800,
      tenure: "99 yrs leasehold",
      sizes: [60, 97, 138, 175]
    },
    {
      name: "WALLICH RESIDENCE",
      street: "Wallich Street",
      district: "02",
      segment: "CCR",
      planningArea: "Downtown Core",
      lat: 1.2764,
      lng: 103.8447,
      basePsqm: 31000,
      tenure: "99 yrs leasehold",
      sizes: [57, 89, 122, 185]
    },
    {
      name: "CANNINGHILL PIERS",
      street: "River Valley Road",
      district: "06",
      segment: "CCR",
      planningArea: "Singapore River",
      lat: 1.2912,
      lng: 103.8436,
      basePsqm: 28500,
      tenure: "99 yrs leasehold",
      sizes: [48, 76, 116, 150]
    },
    {
      name: "COSTA DEL SOL",
      street: "Bayshore Road",
      district: "16",
      segment: "OCR",
      planningArea: "Bedok",
      lat: 1.3068,
      lng: 103.9372,
      basePsqm: 13200,
      tenure: "99 yrs leasehold",
      sizes: [88, 121, 142, 165]
    },
    {
      name: "AMBER PARK",
      street: "Amber Gardens",
      district: "15",
      segment: "RCR",
      planningArea: "Marine Parade",
      lat: 1.2995,
      lng: 103.8996,
      basePsqm: 23800,
      tenure: "Freehold",
      sizes: [43, 77, 121, 190]
    },
    {
      name: "PASIR RIS 8",
      street: "Pasir Ris Drive 8",
      district: "18",
      segment: "OCR",
      planningArea: "Pasir Ris",
      lat: 1.3732,
      lng: 103.9493,
      basePsqm: 16500,
      tenure: "99 yrs leasehold",
      sizes: [48, 67, 95, 121]
    },
    {
      name: "JADESCAPE",
      street: "Shunfu Road",
      district: "20",
      segment: "RCR",
      planningArea: "Bishan",
      lat: 1.3524,
      lng: 103.8415,
      basePsqm: 17200,
      tenure: "99 yrs leasehold",
      sizes: [49, 71, 94, 132]
    }
  ];

  const floorRanges = ["01 to 05", "06 to 10", "11 to 15", "16 to 20", "21 to 25", "26 to 30", "31 to 35+"];
  const saleTypes = ["Resale", "Resale", "Resale", "New Sale", "Sub Sale"];

  let seededCount = 0;

  for (const dev of mockDevelopments) {
    let projRecord = await dbGet(`SELECT project_id FROM projects WHERE project_name = ?`, [dev.name]);
    let projId;

    if (!projRecord) {
      const res = await dbRun(
        `INSERT INTO projects (project_name, street_name, postal_district, market_segment, planning_area, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [dev.name, dev.street, dev.district, dev.segment, dev.planningArea, dev.lat, dev.lng]
      );
      projId = res.lastID;
    } else {
      projId = projRecord.project_id;
    }

    // Generate transactions from Jan 2021 to Jun 2026
    for (let year = 2021; year <= 2026; year++) {
      const maxMonth = year === 2026 ? 7 : 12;
      for (let month = 1; month <= maxMonth; month += Math.floor(Math.random() * 2) + 1) {
        const mStr = String(month).padStart(2, '0');
        const dateStr = `${year}-${mStr}-01`;

        const timeMultiplier = 1 + (year - 2021) * 0.045 + (month / 12) * 0.03;
        
        const txCount = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < txCount; i++) {
          const areaSqm = dev.sizes[Math.floor(Math.random() * dev.sizes.length)] + (Math.random() * 4 - 2);
          const roundedAreaSqm = Math.round(areaSqm * 100) / 100;
          const areaSqft = roundedAreaSqm * 10.7639;

          const floorIdx = Math.floor(Math.random() * floorRanges.length);
          const floorBoost = 1 + floorIdx * 0.025;

          const noise = 1 + (Math.random() * 0.08 - 0.04);
          const psqm = Math.round(dev.basePsqm * timeMultiplier * floorBoost * noise * 100) / 100;
          const price = Math.round(psqm * roundedAreaSqm);
          const psft = Math.round((price / areaSqft) * 100) / 100;

          const floorRange = floorRanges[floorIdx];
          const typeOfSale = saleTypes[Math.floor(Math.random() * saleTypes.length)];
          const rawHash = generateTxHash(dev.name, dateStr, price, roundedAreaSqm, floorRange + `_${i}`);

          try {
            await dbRun(
              `INSERT INTO property_transactions 
               (project_id, area_sqm, area_sqft, price_sgd, psqm_sgd, psft_sgd, contract_date, floor_range, tenure, type_of_sale, property_type, raw_hash)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [projId, roundedAreaSqm, areaSqft, price, psqm, psft, dateStr, floorRange, dev.tenure, typeOfSale, 'Condominium', rawHash]
            );
            seededCount++;
          } catch (err) {
            // Ignore hash collisions
          }
        }
      }
    }
  }

  console.log(`Seeding complete. Inserted ${seededCount} historical property transactions.`);
  return seededCount;
}
