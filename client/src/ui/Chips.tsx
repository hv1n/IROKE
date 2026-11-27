import { useId } from 'react';

interface ChipOption<T> {
  value: T;
  label: string;
}

interface ChipSelectProps<T extends string | number> {
  label: string;
  value: T | null;
  options: ChipOption<T>[];
  onChange: (value: T) => void;
}

/** 하나만 고르는 칩 (라디오). 화살표 키 이동은 브라우저 기본 동작 */
export function ChipSelect<T extends string | number>({ label, value, options, onChange }: ChipSelectProps<T>) {
  const name = useId();
  return (
    <div className="u-chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={String(o.value)} className="u-chip">
          <input
            type="radio"
            className="visually-hidden"
            name={name}
            checked={o.value === value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

interface ChipMultiProps<T extends string | number> {
  label: string;
  values: T[];
  options: ChipOption<T>[];
  onChange: (values: T[]) => void;
}

/** 여러 개 고르는 칩 (체크박스) */
export function ChipMulti<T extends string | number>({ label, values, options, onChange }: ChipMultiProps<T>) {
  return (
    <div className="u-chips" role="group" aria-label={label}>
      {options.map((o) => {
        const on = values.includes(o.value);
        return (
          <label key={String(o.value)} className="u-chip">
            <input
              type="checkbox"
              className="visually-hidden"
              checked={on}
              onChange={() => onChange(on ? values.filter((v) => v !== o.value) : [...values, o.value])}
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

/** 지울 수 있는 칩 (지역 등) */
export function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="u-chip is-on">
      {label}
      <button type="button" className="u-chip__remove" onClick={onRemove} aria-label={`${label} 빼기`}>
        ×
      </button>
    </span>
  );
}
