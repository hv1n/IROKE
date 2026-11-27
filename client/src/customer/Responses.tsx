import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { ResponseCard, ResponseSort } from '@iroke/shared';
import { AppScreen, BottomSheet, Button, Notice, ScreenTitle, WheelPicker } from '../ui';
import circleCheck from '../ui/assets/circle-check.svg';
import sortChevron from '../ui/assets/sort-chevron.svg';
import { AcceptSheet } from './AcceptSheet';
import { GradeModal } from './GradeModal';
import { AVAILABILITY_LABELS, SORT_LABELS, priceText } from './labels';
import { customerApi } from './mockApi';
import { Avatar, GradeBadge, PlainHeader } from './parts';

const SORTS = (Object.keys(SORT_LABELS) as ResponseSort[]).map((value) => ({ value, label: SORT_LABELS[value] }));

/** 요청내역 - 응답보러가기 (Figma 517:1279) */
export function Responses() {
  const { id = '' } = useParams();
  const [sort, setSort] = useState<ResponseSort>('price_asc');
  const [items, setItems] = useState<ResponseCard[] | null>(null);
  const [error, setError] = useState('');
  const [grades, setGrades] = useState(false);
  const [sortSheet, setSortSheet] = useState(false);
  const [draftSort, setDraftSort] = useState<ResponseSort>(sort);
  const [accepting, setAccepting] = useState<ResponseCard | null>(null);

  useEffect(() => {
    customerApi
      .listResponses(id, sort)
      .then(({ items }) => {
        setItems(items);
        customerApi.markSeen(id);
      })
      .catch((e: Error) => setError(e.message));
  }, [id, sort]);

  const live = items?.filter((r) => r.status !== 'not_selected') ?? [];

  return (
    <AppScreen header={<PlainHeader />}>
      <ScreenTitle title={items ? (live.length ? `디자이너 ${live.length}명이 응답했어요.` : '아직 응답이 없어요.') : '응답을 불러오고 있어요.'} />
      {error && <Notice tone="error">{error}</Notice>}
      {items && items.length > 0 && (
        <div className="resp-tools">
          <button type="button" className="link-button" onClick={() => setGrades(true)}>
            카드에 있는 가위는 뭔가요?
          </button>
          <button
            type="button"
            className="sort-button"
            onClick={() => {
              setDraftSort(sort);
              setSortSheet(true);
            }}
          >
            <img src={sortChevron} alt="" />
            {SORT_LABELS[sort]}
          </button>
        </div>
      )}
      {items && items.length === 0 && <p className="empty">디자이너가 응답하면 알림으로 알려드릴게요.</p>}

      <ul className="resp-list">
        {live.map((r) => (
          <li key={r.id} className="resp-card">
            <div className="resp-card__head">
              <Avatar size={31} />
              <span className="resp-card__nick">{r.designer.nickname}</span>
              <GradeBadge count={r.designer.verifiedWorkCount} />
            </div>
            <p className="resp-card__shop">{r.designer.shopName}</p>
            <p className="resp-card__offer">
              <span className="resp-card__avail">
                <img src={circleCheck} alt="" />
                {AVAILABILITY_LABELS[r.availability]}
              </span>
              <b>{priceText(r.priceMin, r.priceMax)}</b>
              {r.isOutdated && <span className="resp-card__outdated">수정 전 조건</span>}
            </p>
            <p className="resp-card__comment">“{r.comment}”</p>
            {r.condition && <p className="resp-card__condition">조건: {r.condition}</p>}
            <div className="button-row resp-card__actions">
              <Link className="btn btn--secondary btn--md resp-card__profile" to={`/designers/${r.designer.id}?response=${r.id}&request=${id}`}>
                프로필
              </Link>
              <Button size="md" disabled={r.status !== 'pending'} onClick={() => setAccepting(r)}>
                {r.status === 'accepted' ? '맡긴 디자이너' : '이 디자이너로 →'}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <GradeModal open={grades} onClose={() => setGrades(false)} />
      <BottomSheet
        open={sortSheet}
        onClose={() => setSortSheet(false)}
        title="정렬"
        footer={
          <Button
            onClick={() => {
              setSort(draftSort);
              setSortSheet(false);
            }}
          >
            확인
          </Button>
        }
      >
        <WheelPicker label="정렬 기준" value={draftSort} options={SORTS} onChange={setDraftSort} />
      </BottomSheet>
      <AcceptSheet response={accepting} onClose={() => setAccepting(null)} />
    </AppScreen>
  );
}
