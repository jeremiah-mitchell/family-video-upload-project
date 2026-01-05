'use client';

import type { ChangeEvent } from 'react';
import styles from './filter-dropdown.module.css';

export type FilterValue = 'untagged' | 'tagged' | 'all';

export interface FilterDropdownProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}

export function FilterDropdown({ value, onChange }: FilterDropdownProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as FilterValue);
  };

  return (
    <div className={styles.container}>
      <label htmlFor="filter-select" className={styles.label}>
        Show:
      </label>
      <select
        id="filter-select"
        className={styles.select}
        value={value}
        onChange={handleChange}
      >
        <option value="untagged">Untagged</option>
        <option value="tagged">Tagged</option>
        <option value="all">All</option>
      </select>
    </div>
  );
}
