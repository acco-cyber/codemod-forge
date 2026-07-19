import React, { forwardRef } from 'react';

// Demo 2: forwardRef with generic type params
interface SelectProps<T> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps<string>>(
  function Select({ options, value, onChange, label }, ref) {
    return (
      <div className="select-wrapper">
        <label>{label}</label>
        <select ref={ref} value={value} onChange={e => onChange(e.target.value)}>
          {options.map(opt => (
            <option key={String(opt)} value={String(opt)}>
              {String(opt)}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

export default Select;
