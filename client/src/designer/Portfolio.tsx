import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { TREATMENT_LABELS, type PortfolioItem } from '@iroke/shared';
import { hairSummary } from '../customer/labels';
import { PlainHeader, Thumb } from '../customer/parts';
import { AppScreen, ScreenTitle, TabBar } from '../ui';
import { designerApi } from './mockApi';
import { DESIGNER_TABS, DESIGNER_TAB_LABELS } from './tabs';

/** 내 포트폴리오 (Figma 547:6634). 인증 작업물은 손님이 완료를 확인하면 자동으로 쌓인다 */
export function Portfolio() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PortfolioItem[] | null>(null);
  useEffect(() => {
    designerApi.myPortfolio().then(setItems);
  }, []);
  return (
    <AppScreen header={<PlainHeader onBack={() => navigate('/pro/my')} />} tabBar={<TabBar active="my" links={DESIGNER_TABS} labels={DESIGNER_TAB_LABELS} />}>
      <ScreenTitle title="내 포트폴리오" sub={'이로케 인증 작업물은 시술 완료가\n확인되면 자동으로 쌓여요.'} />
      {items && <p className="portfolio-count">총 {items.length}개</p>}
      {items?.length === 0 && <p className="empty">아직 작업물이 없어요. 손님이 시술 완료를 확인하면 여기에 쌓여요.</p>}
      <ul className="work-list portfolio-list">
        {items?.map((w) => (
          <li key={w.id} className="work-card">
            <div className="work-card__shots">
              <figure>
                <Thumb src={null} alt="시술 전 카드" label="모발 카드" />
                <figcaption>시술 전 카드</figcaption>
              </figure>
              <figure>
                <Thumb src={w.designImageUrl} alt="요청 시안" />
                <figcaption>요청 시안</figcaption>
              </figure>
              <figure>
                <Thumb src={w.resultImageUrl} alt="실제 결과" />
                <figcaption>실제 결과</figcaption>
              </figure>
            </div>
            <p className="work-card__title">
              {w.styleTag}
              {w.treatmentType && ` · ${TREATMENT_LABELS[w.treatmentType]}`}
            </p>
            {w.beforeCard && <p className="work-card__tags">{hairSummary(w.beforeCard)}</p>}
          </li>
        ))}
      </ul>
    </AppScreen>
  );
}
