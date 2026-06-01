import React from 'react';
import { Search } from 'lucide-react';

export default function SearchFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filterValue,
  onFilterChange,
  filterOptions = [],
  filterLabel = 'Filter',
  showFilter = false,
}) {
  return (
    <div className="search-filter-bar">
      <label className="search-filter-search">
        <Search size={18} className="search-filter-icon" aria-hidden />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
      </label>

      {showFilter ? (
        <label className="search-filter-select-wrap">
          <span className="search-filter-select-label">{filterLabel}</span>
          <select
            className="search-filter-select"
            value={filterValue}
            onChange={(e) => onFilterChange(e.target.value)}
          >
            {filterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
