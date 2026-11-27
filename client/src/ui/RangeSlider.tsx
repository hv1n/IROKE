import type { CSSProperties } from 'react';

interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** 양 끝 설명 (1 어두움 · 10 밝음) */
  minLabel: string;
  maxLabel: string;
  valueText?: string;
}

/** 굵은 막대 슬라이더 (현재 밝기) */
export function RangeSlider({ label, value, min, max, onChange, minLabel, maxLabel, valueText }: RangeSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="u-range">
      <input
        type="range"
        className="u-range__input"
        style={{ '--pct': `${pct}%` } as CSSProperties}
        min={min}
        max={max}
        step={1}
        value={value}
        aria-label={label}
        aria-valuetext={valueText}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="u-range__scale" aria-hidden="true">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
