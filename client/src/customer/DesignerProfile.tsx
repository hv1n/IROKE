import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router';
import { TREATMENT_LABELS, type DesignerPublicProfile, type DesignerReview, type PortfolioItem, type ResponseCard } from '@iroke/shared';
import { useAuth } from '../account/AuthProvider';
import { AppScreen, Button, Notice, ScreenTitle } from '../ui';
import instagram from '../ui/assets/instagram.svg';
import { AcceptSheet } from './AcceptSheet';
import { hairSummary } from './labels';
import { customerApi } from './api';
import { Avatar, GradeBadge, LoadFailed, PlainHeader, Thumb } from './parts';

type Tab = 'verified' | 'manual' | 'reviews';
const SATISFACTION = { good: '만족', ok: '보통', bad: '아쉬움' } as const;

/** 요청내역 - 프로필 (Figma 546:3912 · 547:4169). 인증 작업물에 '내 모발 조건과 비슷한 작업만' 필터 (WF-9) */
export function DesignerProfile() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const responseId = params.get('response');
  const requestId = params.get('request');
  const [profile, setProfile] = useState<DesignerPublicProfile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<DesignerReview[]>([]);
  const [response, setResponse] = useState<ResponseCard | null>(null);
  const [tab, setTab] = useState<Tab>('verified');
  const canMatch = Boolean(useAuth().user?.hasHairProfile);
  const [similar, setSimilar] = useState(false);
  const [similarItems, setSimilarItems] = useState<PortfolioItem[] | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([customerApi.getDesigner(id), customerApi.getPortfolio(id), customerApi.getReviews(id)])
      .then(([p, f, r]) => {
        setProfile(p);
        setPortfolio(f.items);
        setReviews(r.items);
      })
      .catch((e: Error) => setError(e.message));
    if (requestId && responseId)
      customerApi.listResponses(requestId).then(({ items }) => setResponse(items.find((r) => r.id === responseId) ?? null));
  }, [id, requestId, responseId]);

  useEffect(() => {
    if (!similar || similarItems) return;
    customerApi
      .getPortfolio(id, 'verified', true)
      .then(({ items }) => setSimilarItems(items))
      .catch((e: Error) => setError(e.message));
  }, [similar, similarItems, id]);

  const shown = tab === 'verified' && similar ? (similarItems ?? []) : portfolio.filter((p) => p.source === tab);
  const tabs: [Tab, string][] = [
    ['verified', `이로케 작업물 ${profile?.verifiedWorkCount ?? 0}`],
    ...(profile?.manualWorkCount ? ([['manual', `일반 작업물 ${profile.manualWorkCount}`]] as [Tab, string][]) : []),
    ['reviews', `후기 ${profile?.reviewCount ?? 0}`],
  ];

  if (!profile && error) return <LoadFailed message={error} label="뒤로 가기" to={requestId ? `/requests/${requestId}/responses` : '/requests'} />;

  return (
    <AppScreen
      header={<PlainHeader />}
      bottom={
        response?.status === 'pending' ? <Button onClick={() => setAccepting(true)}>이 디자이너로 →</Button> : undefined
      }
    >
      <ScreenTitle title="디자이너 프로필" />
      {error && <Notice tone="error">{error}</Notice>}
      {profile && (
        <section className="designer-card">
          <Avatar size={77} />
          <div>
            <p className="designer-card__name">
              {profile.nickname} <GradeBadge count={profile.verifiedWorkCount} temperature={profile.temperature} disputes={profile.recentDisputes90d} showCount={false} />
            </p>
            <p className="designer-card__shop">
              {profile.shopName} · {profile.area}
            </p>
            {profile.instagram && (
              <p className="designer-card__insta">
                <img src={instagram} alt="인스타그램" width={15} height={15} />
                {profile.instagram}
              </p>
            )}
          </div>
        </section>
      )}

      <div className="u-chips designer-tabs" role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={`u-chip${tab === key ? ' is-on' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'verified' && canMatch && (
        <div className="u-chips similar-filter">
          <button type="button" aria-pressed={similar} className={`u-chip${similar ? ' is-on' : ''}`} onClick={() => setSimilar((v) => !v)}>
            {similar ? '✓ ' : ''}내 모발 조건과 비슷한 작업만
          </button>
        </div>
      )}
      {tab !== 'reviews' && (
        <ul className="work-list">
          {shown.length === 0 && (
            <li className="empty">{tab === 'verified' && similar ? (similarItems ? '내 모발 조건(기장·모질)과 비슷한 작업물이 아직 없어요.' : '불러오고 있어요.') : '아직 작업물이 없어요.'}</li>
          )}
          {shown.map((w) => (
            <li key={w.id} className="work-card">
              <div className="work-card__shots">
                {w.source === 'verified' && (
                  <figure>
                    <Thumb src={null} alt="시술 전 카드" label="모발 카드" />
                    <figcaption>시술 전 카드</figcaption>
                  </figure>
                )}
                {w.source === 'verified' && (
                  <figure>
                    <Thumb src={w.designImageUrl} alt="요청 시안" />
                    <figcaption>요청 시안</figcaption>
                  </figure>
                )}
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
      )}

      {tab === 'reviews' && (
        <ul className="review-list">
          {reviews.length === 0 && <li className="empty">아직 후기가 없어요.</li>}
          {reviews.map((r, i) => (
            <li key={i} className="review-card">
              <p className="review-card__meta">
                결과 {SATISFACTION[r.satisfaction]} · {r.createdAt.slice(0, 10).replaceAll('-', '.')}
              </p>
              {r.text && <p className="review-card__text">{r.text}</p>}
            </li>
          ))}
        </ul>
      )}

      <AcceptSheet response={accepting ? response : null} onClose={() => setAccepting(false)} />
    </AppScreen>
  );
}
