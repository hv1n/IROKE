import { useState } from 'react';
import prevIcon from './assets/month-prev.svg';
import nextIcon from './assets/month-next.svg';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

interface CalendarProps {
  /** YYYY-MM-DD */
  value?: string;
  /** 이 날짜 뒤는 고를 수 없다 (YYYY-MM-DD) */
  max?: string;
  onChange: (value: string) => void;
}

/** 월 달력 (시술 날짜 선택). 앞뒤 달 날짜는 흐리게 보이고 누르면 그 달로 넘어간다 */
export function Calendar({ value, max, onChange }: CalendarProps) {
  const base = value ? new Date(`${value}T00:00:00`) : max ? new Date(`${max}T00:00:00`) : new Date();
  const [month, setMonth] = useState(() => new Date(base.getFullYear(), base.getMonth(), 1));
  const y = month.getFullYear();
  const m = month.getMonth();
  const start = new Date(y, m, 1 - month.getDay());
  const weeks = Math.ceil((month.getDay() + new Date(y, m + 1, 0).getDate()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const nextDisabled = Boolean(max && iso(new Date(y, m + 1, 1)) > max);

  return (
    <div className="u-cal">
      <div className="u-cal__head">
        <p className="u-cal__title" aria-live="polite">
          {y}년 {m + 1}월
        </p>
        <button type="button" className="u-icon-button" aria-label="이전 달" onClick={() => setMonth(new Date(y, m - 1, 1))}>
          <img src={prevIcon} alt="" />
        </button>
        <button type="button" className="u-icon-button" aria-label="다음 달" disabled={nextDisabled} onClick={() => setMonth(new Date(y, m + 1, 1))}>
          <img className="u-cal__next" src={nextIcon} alt="" />
        </button>
      </div>
      <div className="u-cal__grid" role="grid" aria-label={`${y}년 ${m + 1}월`}>
        {WEEK.map((w) => (
          <span key={w} className="u-cal__week" role="columnheader">
            {w}
          </span>
        ))}
        {days.map((d) => {
          const key = iso(d);
          const out = d.getMonth() !== m;
          const future = Boolean(max && key > max);
          const on = key === value;
          return (
            <button
              key={key}
              type="button"
              className={`u-cal__day${out ? ' is-out' : ''}${on ? ' is-on' : ''}`}
              disabled={future}
              aria-pressed={on}
              aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일`}
              onClick={() => {
                if (out) setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                onChange(key);
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
