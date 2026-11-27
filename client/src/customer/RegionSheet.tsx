import { useState } from 'react';
import { MARKETPLACE_LIMITS } from '@iroke/shared';
import { BottomSheet, ChipSelect } from '../ui';
import chipRemove from '../ui/assets/chip-remove.svg';
import { REGIONS } from './regions';

const CITY_OPTIONS = Object.keys(REGIONS).map((value) => ({ value, label: value }));

/** 고른 지역 칩 (× 로 빼기) */
export function RegionChips({ regions, onChange }: { regions: string[]; onChange: (r: string[]) => void }) {
  return (
    <>
      {regions.map((r) => (
        <span key={r} className="u-chip region-chip">
          <button type="button" className="region-chip__remove" aria-label={`${r} 빼기`} onClick={() => onChange(regions.filter((x) => x !== r))}>
            <img src={chipRemove} alt="" />
          </button>
          {r}
        </span>
      ))}
    </>
  );
}

/** 지역 고르기 시트 (시·도 → 시·군·구, 최대 2곳) */
export function RegionSheet({ open, onClose, regions, onChange, title = '지역 추가' }: { open: boolean; onClose: () => void; regions: string[]; onChange: (r: string[]) => void; title?: string }) {
  const [city, setCity] = useState('서울');
  const full = regions.length >= MARKETPLACE_LIMITS.regionsMax;
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <ChipSelect label="시·도" value={city} options={CITY_OPTIONS} onChange={setCity} />
      <div className="u-chips region-list" role="group" aria-label={`${city} 시·군·구`}>
        {REGIONS[city]!.map((d) => {
          const value = `${city} ${d}`;
          const on = regions.includes(value);
          return (
            <button
              key={d}
              type="button"
              className={`u-chip${on ? ' is-on' : ''}`}
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => {
                onChange(on ? regions.filter((x) => x !== value) : [...regions, value]);
                if (!on && regions.length + 1 >= MARKETPLACE_LIMITS.regionsMax) onClose();
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
