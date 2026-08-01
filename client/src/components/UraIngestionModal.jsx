import React, { useState } from 'react';
import axios from 'axios';
import { X, Database, Key, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function UraIngestionModal({ isOpen, onClose, onIngestionComplete }) {
  const [accessKey, setAccessKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleLiveIngestion = async (e) => {
    e.preventDefault();
    if (!accessKey.trim()) {
      setError('Please enter your URA Data Service Access Key.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Connecting to URA Data Service (Token Exchange & Batches 1-4)...');

    try {
      const res = await axios.post('/api/ingest/ura', { accessKey: accessKey.trim() });
      setStatusMessage(`Live ingestion complete! Successfully stored ${res.data.totalIngested} transaction caveats.`);
      onIngestionComplete();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedMockData = async () => {
    setLoading(true);
    setError(null);
    setStatusMessage('Generating realistic Singapore property dataset...');

    try {
      const res = await axios.post('/api/ingest/seed');
      setStatusMessage(`Mock seed complete! Loaded ${res.data.count} transactions across CCR, RCR, & OCR developments.`);
      onIngestionComplete();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>
            <Database size={20} color="var(--accent-primary)" />
            URA API Data Ingestion & Demo Sync
          </h3>
          <X size={18} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={onClose} />
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Fetch live Singapore residential transactions from URA Data Service API, or reload the offline mock dataset for rapid testing.
        </p>

        {statusMessage && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent-emerald)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', color: '#a7f3d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="var(--accent-emerald)" />
            {statusMessage}
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--accent-rose)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', color: '#fecdd3', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} color="var(--accent-rose)" />
            {error}
          </div>
        )}

        <form onSubmit={handleLiveIngestion} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="filter-group">
            <label className="filter-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={14} color="var(--accent-cyan)" /> URA Access Key (Daily Token Workflow)
            </label>
            <input
              type="text"
              className="input-box"
              placeholder="Paste URA Access Key here..."
              value={accessKey}
              onChange={e => setAccessKey(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center' }}>
            {loading ? <RefreshCw size={16} className="spin" /> : 'Run Live URA API Ingestion'}
          </button>
        </form>

        <div style={{ position: 'relative', textAlign: 'center', margin: '8px 0' }}>
          <span style={{ background: 'var(--bg-surface)', padding: '0 10px', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
            OR USE DEMO MODE
          </span>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', position: 'absolute', top: '50%', width: '100%', zIndex: -1 }} />
        </div>

        <button className="btn" onClick={handleSeedMockData} disabled={loading} style={{ justifyContent: 'center' }}>
          <RefreshCw size={14} /> Re-seed Offline Realistic Dataset
        </button>

        <div style={{ textAlign: 'right', marginTop: '8px' }}>
          <button className="btn" onClick={onClose} style={{ fontSize: '0.8rem' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
