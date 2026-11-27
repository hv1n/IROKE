import type { ReactNode } from 'react';
import cameraIcon from './assets/camera.svg';

interface PhotoCardProps {
  image?: string;
  alt: string;
  /** 카드를 누르면 (사진 고르기·촬영) */
  onPick?: () => void;
  /** lg 204×258 (셀카·레퍼런스·시안) · md 190×241 (스타일) · sm 163×206 (조건 확인 2장) */
  size?: 'lg' | 'md' | 'sm';
  /** 빈 카드 안 문구 (업로드는 선택이에요 등) */
  emptyText?: string;
  disabled?: boolean;
  /** 사진 대신 넣을 내용 (비교 슬라이더 등) */
  children?: ReactNode;
}

/** 둥근 사진 카드. 사진이 없으면 점선 + 카메라 아이콘 */
export function PhotoCard({ image, alt, onPick, size = 'lg', emptyText, disabled, children }: PhotoCardProps) {
  const cls = `photo-card photo-card--${size}${image || children ? '' : ' is-empty'}`;
  const inner = children ?? (image ? <img src={image} alt={alt} /> : (
    <span className="photo-card__empty">
      <img src={cameraIcon} alt="" />
      {emptyText && <span>{emptyText}</span>}
    </span>
  ));
  if (!onPick) return <div className={cls}>{inner}</div>;
  return (
    <button type="button" className={cls} onClick={onPick} disabled={disabled} aria-label={image ? `${alt} 바꾸기` : alt}>
      {inner}
    </button>
  );
}
