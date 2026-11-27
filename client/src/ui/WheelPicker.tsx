import { useEffect, useId, useRef } from 'react';

interface WheelPickerProps<T extends string | number> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

const ROW = 32; // ui.css .wheel --row 와 같아야 한다

/** 바텀시트 안 휠 목록. 스크롤이 멈춘 자리(가운데 띠)의 항목이 선택된다. 누르거나 ↑↓ 키로도 고른다 */
export function WheelPicker<T extends string | number>({ label, value, options, onChange }: WheelPickerProps<T>) {
  const ref = useRef<HTMLUListElement>(null);
  const base = useId();
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  // 밖에서 값이 바뀌면 그 자리로 스크롤 (처음엔 애니메이션 없이)
  const first = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || Math.round(el.scrollTop / ROW) === index) return;
    el.scrollTo({ top: index * ROW, behavior: first.current ? 'instant' : 'smooth' });
    first.current = false;
  }, [index]);

  // 스크롤이 멈추면 가운데 항목으로 값을 맞춘다
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let t = 0;
    const settle = () => {
      const i = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
      if (options[i] && options[i].value !== value) onChange(options[i].value);
    };
    const onScroll = () => {
      window.clearTimeout(t);
      t = window.setTimeout(settle, 120);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.clearTimeout(t);
    };
  }, [options, value, onChange]);

  const move = (d: number) => {
    const o = options[index + d];
    if (o) onChange(o.value);
  };

  return (
    <div className="wheel">
      <div className="wheel__band" aria-hidden="true" />
      <ul
        ref={ref}
        className="wheel__list"
        role="listbox"
        tabIndex={0}
        aria-label={label}
        aria-activedescendant={`${base}-${index}`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') move(1);
          else if (e.key === 'ArrowUp') move(-1);
          else return;
          e.preventDefault();
        }}
      >
        {options.map((o, i) => (
          <li
            key={String(o.value)}
            id={`${base}-${i}`}
            role="option"
            aria-selected={i === index}
            className="wheel__option"
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
