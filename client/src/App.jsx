import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Building2, Database, DollarSign, TrendingUp, BarChart3, Layers, Calendar, ExternalLink } from 'lucide-react';
import SearchHeader from './components/SearchHeader';
import PropertyMap from './components/PropertyMap';
import AnalyticsCharts from './components/AnalyticsCharts';
import UraIngestionModal from './components/UraIngestionModal';

export default function App() {
  const [unitType, setUnitType] = useState('sqm'); // 'sqm' or 'sqft'
  const [filters, setFilters] = useState({
    projects: [],
    street: null,
    district: null,
    planningArea: null,
    radiusKm: null,
    centerCoords: null,
    dateFrom: '2021-01-01',
    dateTo: '2026-12-31',
    unitSizeMin: 0,
    unitSizeMax: 10000
  });

  const [analyticsData, setAnalyticsData] = useState({
    summary: { totalVolume: 0, medianPrice: 0, medianPsqm: 0, medianPsft: 0, minPrice: 0, maxPrice: 0 },
    timeSeries: [],
    scatterPoints: [],
    mapProjects: []
  });

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/analytics/price-trends', {
        filters: {
          ...filters,
          unitType
        }
      });
      setAnalyticsData(res.data);
    } catch (err) {
      console.error('Error loading property analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, unitType]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const summary = analyticsData.summary || {};
  const currentMedianRate = unitType === 'sqm' ? summary.medianPsqm : summary.medianPsft;

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <Building2 size={22} />
          </div>
          <div>
            <div className="brand-title">Habitat Real Estate Engine</div>
            <div className="brand-sub">Singapore Property Valuation & Spatial Analytics</div>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Database size={16} /> Sync URA API Data
          </button>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="main-content">
        {/* Unified Search & Filters Header */}
        <SearchHeader
          filters={filters}
          setFilters={setFilters}
          unitType={unitType}
          setUnitType={setUnitType}
        />

        {/* Metrics Summary Cards */}
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-title">Estimated Median Valuation</span>
            <div className="metric-value" style={{ color: 'var(--color-primary-green)' }}>
              ${summary.medianPrice ? Math.round(summary.medianPrice).toLocaleString() : '0'} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>SGD</span>
            </div>
            <span className="metric-sub">Based on {summary.totalVolume} transactions recorded</span>
          </div>

          <div className="metric-card teal">
            <span className="metric-title">Median Unit Rate (${unitType.toUpperCase()})</span>
            <div className="metric-value" style={{ color: 'var(--color-accent-teal)' }}>
              ${currentMedianRate ? Math.round(currentMedianRate).toLocaleString() : '0'} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>/{unitType}</span>
            </div>
            <span className="metric-sub">Equivalent: ${summary.medianPsft ? Math.round(summary.medianPsft).toLocaleString() : '0'} /sqft</span>
          </div>

          <div className="metric-card terracotta">
            <span className="metric-title">Recorded Sales Volume</span>
            <div className="metric-value" style={{ color: 'var(--color-primary-terracotta)' }}>
              {summary.totalVolume} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>caveats</span>
            </div>
            <span className="metric-sub">Period: {filters.dateFrom} to {filters.dateTo}</span>
          </div>

          <div className="metric-card amber">
            <span className="metric-title">Transaction Price Range</span>
            <div className="metric-value" style={{ color: '#D97706', fontSize: '1.4rem' }}>
              ${summary.minPrice ? (summary.minPrice / 1e6).toFixed(2) : '0'}M – ${summary.maxPrice ? (summary.maxPrice / 1e6).toFixed(2) : '0'}M
            </div>
            <span className="metric-sub">Avg Sale Price: ${summary.averagePrice ? Math.round(summary.averagePrice).toLocaleString() : '0'}</span>
          </div>
        </div>

        {/* Main Grid: Charts & GIS Map */}
        <div className="dashboard-grid">
          <AnalyticsCharts
            timeSeries={analyticsData.timeSeries}
            scatterPoints={analyticsData.scatterPoints}
            unitType={unitType}
          />

          <PropertyMap
            mapProjects={analyticsData.mapProjects}
            filters={filters}
            setFilters={setFilters}
            unitType={unitType}
          />
        </div>

        {/* Detailed Transactions List Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Layers size={18} color="var(--color-primary-green)" />
              Recent Caveat Transactions Log ({analyticsData.scatterPoints?.length || 0} Listed)
            </h3>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Development</th>
                  <th>Contract Date</th>
                  <th>Sale Price (SGD)</th>
                  <th>Rate (${unitType.toUpperCase()})</th>
                  <th>Unit Size</th>
                  <th>Floor Tier</th>
                  <th>Type of Sale</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.scatterPoints && analyticsData.scatterPoints.length > 0 ? (
                  analyticsData.scatterPoints.slice().reverse().map(tx => (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-text-charcoal)' }}>{tx.projectName}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{tx.date}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-green)' }}>${tx.priceSgd.toLocaleString()}</td>
                      <td style={{ color: 'var(--color-accent-teal)', fontWeight: 600 }}>
                        ${(unitType === 'sqm' ? tx.psqm : tx.psft).toLocaleString()} /{unitType}
                      </td>
                      <td>{tx.areaSqm} sqm ({tx.areaSqft} sqft)</td>
                      <td>
                        <span style={{
                          background: 'var(--color-bg-sand)',
                          color: 'var(--color-text-charcoal)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 600
                        }}>
                          {tx.floorRange}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          color: tx.typeOfSale === 'New Sale' ? 'var(--color-primary-green)' : tx.typeOfSale === 'Sub Sale' ? 'var(--color-primary-terracotta)' : 'var(--color-text-muted)',
                          fontWeight: 600
                        }}>
                          {tx.typeOfSale}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>
                      No transaction caveats found for the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Ingestion & Seed Modal */}
      <UraIngestionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onIngestionComplete={fetchAnalytics}
      />
    </div>
  );
}
