import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, X, SlidersHorizontal, MapPin, Building, Map, RefreshCw } from 'lucide-react';

export default function SearchHeader({ filters, setFilters, unitType, setUnitType, onOpenIngestionModal }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Debounced search suggestions fetch
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSuggestions(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/search/suggestions?q=${encodeURIComponent(searchTerm)}`);
        setSuggestions(res.data);
        setShowDropdown(true);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProject = (projName) => {
    if (!filters.projects.includes(projName)) {
      setFilters(prev => ({
        ...prev,
        projects: [...prev.projects, projName]
      }));
    }
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleSelectStreet = (streetName) => {
    setFilters(prev => ({ ...prev, street: streetName }));
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleSelectDistrict = (district) => {
    setFilters(prev => ({ ...prev, district: district }));
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleSelectPlanningArea = (planningArea) => {
    setFilters(prev => ({ ...prev, planningArea: planningArea }));
    setSearchTerm('');
    setShowDropdown(false);
  };

  const removeProjectPill = (projName) => {
    setFilters(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p !== projName)
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      projects: [],
      street: null,
      district: null,
      planningArea: null,
      radiusKm: null,
      centerCoords: null,
      dateFrom: '2021-01-01',
      dateTo: '2026-12-31',
      unitSizeMin: 0,
      unitSizeMax: 300
    });
    setSearchTerm('');
  };

  return (
    <div className="filter-panel" ref={dropdownRef}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SlidersHorizontal size={18} color="var(--accent-cyan)" />
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Property Valuation Filters</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Unit Toggle */}
          <div className="tab-buttons">
            <button
              className={`tab-btn ${unitType === 'sqm' ? 'active' : ''}`}
              onClick={() => setUnitType('sqm')}
            >
              $/SQM
            </button>
            <button
              className={`tab-btn ${unitType === 'sqft' ? 'active' : ''}`}
              onClick={() => setUnitType('sqft')}
            >
              $/SQFT
            </button>
          </div>

          <button className="btn" onClick={clearAllFilters} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            <X size={14} /> Clear Filters
          </button>
        </div>
      </div>

      <div className="filter-grid">
        {/* Autocomplete Search Box */}
        <div className="filter-group" style={{ gridColumn: 'span 2' }}>
          <label className="filter-label">Search Development, Street, District or Planning Area</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input-box"
              placeholder="e.g. Reflections at Keppel Bay, Keppel Bay View, District 04, Bedok..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onFocus={() => suggestions && setShowDropdown(true)}
              style={{ paddingLeft: '36px' }}
            />
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          </div>

          {/* Suggestions Dropdown */}
          {showDropdown && suggestions && (
            <div className="autocomplete-dropdown">
              {suggestions.projects.length > 0 && (
                <>
                  <div className="dropdown-section-title">Developments</div>
                  {suggestions.projects.map(p => (
                    <div key={p.id} className="dropdown-item" onClick={() => handleSelectProject(p.name)}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building size={14} color="var(--accent-primary)" />
                        {p.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>D{p.district} • {p.planningArea}</span>
                    </div>
                  ))}
                </>
              )}

              {suggestions.streets.length > 0 && (
                <>
                  <div className="dropdown-section-title">Streets</div>
                  {suggestions.streets.map((s, idx) => (
                    <div key={idx} className="dropdown-item" onClick={() => handleSelectStreet(s)}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={14} color="var(--accent-cyan)" />
                        {s}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Street</span>
                    </div>
                  ))}
                </>
              )}

              {suggestions.districts.length > 0 && (
                <>
                  <div className="dropdown-section-title">Postal Districts</div>
                  {suggestions.districts.map((d, idx) => (
                    <div key={idx} className="dropdown-item" onClick={() => handleSelectDistrict(d)}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Map size={14} color="var(--accent-amber)" />
                        District {d}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Postal District</span>
                    </div>
                  ))}
                </>
              )}

              {suggestions.planningAreas.length > 0 && (
                <>
                  <div className="dropdown-section-title">Planning Areas</div>
                  {suggestions.planningAreas.map((pa, idx) => (
                    <div key={idx} className="dropdown-item" onClick={() => handleSelectPlanningArea(pa)}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={14} color="var(--accent-emerald)" />
                        {pa}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Planning Area</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Date From */}
        <div className="filter-group">
          <label className="filter-label">Contract Date From</label>
          <input
            type="date"
            className="input-box"
            value={filters.dateFrom}
            onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
          />
        </div>

        {/* Date To */}
        <div className="filter-group">
          <label className="filter-label">Contract Date To</label>
          <input
            type="date"
            className="input-box"
            value={filters.dateTo}
            onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
          />
        </div>

        {/* Unit Size Min/Max */}
        <div className="filter-group">
          <label className="filter-label">Floor Area Max ({unitType === 'sqm' ? 'Sqm' : 'Sqft'})</label>
          <input
            type="number"
            className="input-box"
            placeholder={unitType === 'sqm' ? 'e.g. 200' : 'e.g. 2150'}
            value={filters.unitSizeMax || ''}
            onChange={e => setFilters(prev => ({ ...prev, unitSizeMax: parseFloat(e.target.value) || 10000 }))}
          />
        </div>
      </div>

      {/* Active Filter Pills */}
      <div className="selected-pills">
        {filters.projects.map((p, idx) => (
          <div key={idx} className="pill">
            <Building size={12} />
            <span>{p}</span>
            <X size={12} className="pill-remove" onClick={() => removeProjectPill(p)} />
          </div>
        ))}

        {filters.street && (
          <div className="pill">
            <MapPin size={12} />
            <span>Street: {filters.street}</span>
            <X size={12} className="pill-remove" onClick={() => setFilters(prev => ({ ...prev, street: null }))} />
          </div>
        )}

        {filters.district && (
          <div className="pill">
            <Map size={12} />
            <span>District {filters.district}</span>
            <X size={12} className="pill-remove" onClick={() => setFilters(prev => ({ ...prev, district: null }))} />
          </div>
        )}

        {filters.planningArea && (
          <div className="pill">
            <MapPin size={12} />
            <span>Area: {filters.planningArea}</span>
            <X size={12} className="pill-remove" onClick={() => setFilters(prev => ({ ...prev, planningArea: null }))} />
          </div>
        )}

        {filters.radiusKm && filters.centerCoords && (
          <div className="pill" style={{ borderColor: 'var(--accent-amber)', color: '#fde68a' }}>
            <MapPin size={12} />
            <span>Radius: {filters.radiusKm} km around ({filters.centerCoords.lat.toFixed(3)}, {filters.centerCoords.lng.toFixed(3)})</span>
            <X size={12} className="pill-remove" onClick={() => setFilters(prev => ({ ...prev, radiusKm: null, centerCoords: null }))} />
          </div>
        )}
      </div>
    </div>
  );
}
