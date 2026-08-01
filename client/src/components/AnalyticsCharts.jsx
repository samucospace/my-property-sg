import React, { useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { TrendingUp, Layers, BarChart2 } from 'lucide-react';

const CustomTooltip = ({ active, payload, label, unitType }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        background: '#1e293b',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px 16px',
        borderRadius: '10px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        fontSize: '0.85rem'
      }}>
        <div style={{ fontWeight: 700, marginBottom: '6px', color: '#f8fafc' }}>{label}</div>
        <div style={{ color: '#06b6d4', margin: '3px 0' }}>
          Median Rate: <strong>${(unitType === 'sqm' ? data.medianPsqm : data.medianPsft)?.toLocaleString()}</strong> /{unitType}
        </div>
        <div style={{ color: '#3b82f6', margin: '3px 0' }}>
          Median Price: <strong>${data.medianPrice?.toLocaleString()} SGD</strong>
        </div>
        <div style={{ color: '#10b981', margin: '3px 0' }}>
          Sales Volume: <strong>{data.volume} transactions</strong>
        </div>
      </div>
    );
  };
  return null;
};

export default function AnalyticsCharts({ timeSeries, scatterPoints, unitType }) {
  const [activeTab, setActiveTab] = useState('trend');

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <TrendingUp size={18} color="var(--accent-primary)" />
          Property Valuation & Floor Tier Analytics
        </h3>

        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === 'trend' ? 'active' : ''}`}
            onClick={() => setActiveTab('trend')}
          >
            <BarChart2 size={13} style={{ display: 'inline', marginRight: '4px' }} /> Price & Volume Trend
          </button>
          <button
            className={`tab-btn ${activeTab === 'floor' ? 'active' : ''}`}
            onClick={() => setActiveTab('floor')}
          >
            <Layers size={13} style={{ display: 'inline', marginRight: '4px' }} /> Floor Tier Distribution
          </button>
        </div>
      </div>

      <div style={{ height: '420px', width: '100%', marginTop: '12px' }}>
        {activeTab === 'trend' ? (
          timeSeries && timeSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeSeries} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} />
                
                {/* Left Y-Axis: Rate ($/sqm or $/sqft) */}
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="#06b6d4"
                  fontSize={11}
                  tickFormatter={val => `$${val.toLocaleString()}`}
                  domain={['auto', 'auto']}
                />
                
                {/* Right Y-Axis: Volume */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#10b981"
                  fontSize={11}
                  domain={[0, 'auto']}
                />

                <Tooltip content={<CustomTooltip unitType={unitType} />} />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.8rem' }} />

                <Bar
                  yAxisId="right"
                  dataKey="volume"
                  name="Transaction Volume"
                  fill="#10b981"
                  opacity={0.35}
                  barSize={18}
                  radius={[4, 4, 0, 0]}
                />

                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey={unitType === 'sqm' ? 'medianPsqm' : 'medianPsft'}
                  name={`Median Rate ($/${unitType.toUpperCase()})`}
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#06b6d4' }}
                  activeDot={{ r: 7 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              No transaction history matching current filters.
            </div>
          )
        ) : (
          scatterPoints && scatterPoints.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="floorRange" type="category" stroke="#94a3b8" fontSize={11} name="Floor Range" />
                <YAxis
                  dataKey={unitType === 'sqm' ? 'psqm' : 'psft'}
                  stroke="#3b82f6"
                  fontSize={11}
                  tickFormatter={val => `$${val.toLocaleString()}`}
                  name={`Rate ($/${unitType.toUpperCase()})`}
                />
                <ZAxis dataKey="priceSgd" range={[40, 300]} name="Total Price" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div style={{
                        background: '#1e293b',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '0.8rem'
                      }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>{data.projectName}</div>
                        <div>Floor: {data.floorRange} • {data.typeOfSale}</div>
                        <div>Rate: <strong>${(unitType === 'sqm' ? data.psqm : data.psft)?.toLocaleString()}</strong> /{unitType}</div>
                        <div>Total: <strong>${data.priceSgd?.toLocaleString()} SGD</strong></div>
                        <div>Size: {data.areaSqm} sqm ({data.areaSqft} sqft)</div>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Scatter name="Transactions" data={scatterPoints} fill="#3b82f6" opacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              No scatter plot points available.
            </div>
          )
        )}
      </div>
    </div>
  );
}
