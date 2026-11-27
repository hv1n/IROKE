import type { ReactNode } from 'react';

interface CardProps {
  /** 위쪽 갈색 띠 문구 (요청을 진행하고 있어요.) */
  banner?: ReactNode;
  /** solid: 흰 배경 (응답 보러가기 같은 바로가기 카드) */
  solid?: boolean;
  className?: string;
  children: ReactNode;
}

export function Card({ banner, solid, className, children }: CardProps) {
  return (
    <section className={`u-card${solid ? ' u-card--solid' : ''}${className ? ` ${className}` : ''}`}>
      {banner && <p className="u-card__banner">{banner}</p>}
      <div className="u-card__body">{children}</div>
    </section>
  );
}
