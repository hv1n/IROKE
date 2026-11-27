import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { BackButton } from '../ui';
import arrowCircle from '../ui/assets/arrow-circle.svg';
import avatar from '../ui/assets/avatar.png';
import { gradeOf } from './grade';

/** 뒤로 버튼만 있는 머리 (단계 표시 없는 화면) */
export function PlainHeader({ onBack, end, light }: { onBack?: () => void; end?: ReactNode; light?: boolean }) {
  const navigate = useNavigate();
  return (
    <header className="step-header plain-header">
      <div className="step-header__top">
        <BackButton onClick={onBack ?? (() => navigate(-1))} light={light} />
        {end}
      </div>
    </header>
  );
}

/** 로고만 있는 머리 (탭 화면) */
export function BrandHeader() {
  return (
    <header className="brand-header">
      <span>IROKE</span>
    </header>
  );
}

/** 사진 자리. 이미지가 없으면 회색 자리표시 (목업 디자이너 사진 등) */
export function Thumb({ src, alt, className, label }: { src?: string | null; alt: string; className?: string; label?: string }) {
  return src ? (
    <img className={`thumb ${className ?? ''}`} src={src} alt={alt} />
  ) : (
    <span className={`thumb thumb--empty ${className ?? ''}`} role="img" aria-label={alt}>
      {label ?? '사진'}
    </span>
  );
}

/** AI 시안 카드 한 줄 (Figma 기본리스트 132px) */
export function RequestCardRow({
  image,
  styleTag,
  summary,
  note = '이 정보로 요청할게요.',
  eyebrow = 'AI 시안',
  selected,
  onClick,
}: {
  eyebrow?: ReactNode;
  image?: string | null;
  styleTag: string;
  summary: string;
  note?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <Thumb src={image} alt={`${styleTag} AI 시안`} className="card-row__thumb" />
      <span className="card-row__text">
        <span className="card-row__eyebrow">{eyebrow}</span>
        <span className="card-row__title">{styleTag}</span>
        <span className="card-row__sub">
          {summary}
          {note && (
            <>
              <br />
              {note}
            </>
          )}
        </span>
      </span>
    </>
  );
  return onClick ? (
    <button type="button" className={`card-row${selected ? ' is-selected' : ''}`} onClick={onClick} aria-pressed={selected}>
      {body}
    </button>
  ) : (
    <div className="card-row">{body}</div>
  );
}

export function Avatar({ size }: { size: 31 | 77 }) {
  return <img className="avatar" src={avatar} alt="" width={size} height={size} />;
}

/** 가위 등급 아이콘 + N건 해결. 신규 디자이너는 아이콘 대신 중립 배지 */
export function GradeBadge({ count, temperature, showCount = true }: { count: number; temperature: number; showCount?: boolean }) {
  const g = gradeOf({ temperature, completedCount: count });
  return (
    <span className={`grade grade--${g.grade}`} title={`${g.name} · ${g.desc}`}>
      {g.grade === 'normal' ? <span className="grade__new">신규</span> : <img src={g.icon} alt={g.name} width={20} height={20} />}
      {showCount && (
        <span>
          <b>{count}건</b> 해결
        </span>
      )}
    </span>
  );
}

/** 오른쪽 아래 → 동그라미 (응답 보러가기 카드) */
export function ArrowCircle() {
  return (
    <span className="arrow-circle" aria-hidden="true">
      <img src={arrowCircle} alt="" />
      <span>→</span>
    </span>
  );
}
