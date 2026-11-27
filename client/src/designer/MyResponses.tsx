import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import type { DesignerResponseItem, DesignerResponseTab, PromiseKept } from '@iroke/shared';
import { dday, priceText } from '../customer/labels';
import { PlainHeader, Thumb } from '../customer/parts';
import { normalizeSelfie } from '../flow/lib/image';
import { usePhotoPicker } from '../flow/ui/usePhotoPicker';
import { AppScreen, BottomSheet, Button, ChipSelect, Notice, PhotoCard, ScreenTitle, TabBar } from '../ui';
import circleCheck from '../ui/assets/circle-check.svg';
import { designerApi } from './api';
import { DESIGNER_TABS, DESIGNER_TAB_LABELS } from './tabs';

const TABS: { key: DesignerResponseTab; label: string }[] = [
  { key: 'pending', label: '응답 대기' },
  { key: 'in_progress', label: '진행 중' },
  { key: 'done', label: '완료' },
];
const PROMISE = [
  { value: 'yes' as PromiseKept, label: '네' },
  { value: 'partly' as PromiseKept, label: '일부 달랐어요' },
  { value: 'no' as PromiseKept, label: '오지 않았어요' },
];

/** 항목 상태 → 라벨·설명 */
function describe(i: DesignerResponseItem) {
  const price = priceText(i.response.priceMin, i.response.priceMax);
  if (i.response.status === 'pending') return { label: '응답 보냄', tone: 'gray', sub: [`${price} · 손님이 고르는 중`] };
  if (i.response.status === 'not_selected') return { label: '다른 디자이너가 선택됐어요', tone: 'muted', sub: [price] };
  if (i.match?.status === 'complete_requested')
    return { label: '확인 대기', tone: 'gray', sub: ['손님 확인을 기다리는 중', `${i.match.confirmDeadline ? dday(i.match.confirmDeadline) : ''} (7일 지나면 자동 완료)`] };
  if (i.match?.status === 'completed') return { label: '완료', tone: 'blue', sub: [price] };
  if (i.match?.status === 'disputed') return { label: '손님이 다르다고 알렸어요', tone: 'red', sub: ['IROKE가 확인하고 연락드릴게요'] };
  return { label: '수락됨', tone: 'brown', sub: [price, '예약을 마치고 시술한 뒤 완료를 요청해 주세요'] };
}

/** 내 응답 (Figma 547:6131 · 547:6301 · 547:6468). 탭은 백엔드 기준: 응답 대기 / 진행 중(수락·확인 대기) / 완료 */
export function MyResponses() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.key === params.get('tab'))?.key ?? 'in_progress') as DesignerResponseTab;
  const navigate = useNavigate();
  const location = useLocation();
  const sent = (location.state as { sent?: boolean } | null)?.sent;
  const [items, setItems] = useState<DesignerResponseItem[] | null>(null);
  const [counts, setCounts] = useState<Record<DesignerResponseTab, number> | null>(null);
  const [completing, setCompleting] = useState<DesignerResponseItem | null>(null);
  const [reviewing, setReviewing] = useState<DesignerResponseItem | null>(null);
  const [promise, setPromise] = useState<PromiseKept | null>(null);
  const [photos, setPhotos] = useState<(string | undefined)[]>([undefined, undefined]);
  const [slot, setSlot] = useState(0);
  const [error, setError] = useState('');
  const picker = usePhotoPicker(normalizeSelfie, (img) => setPhotos((p) => p.map((x, i) => (i === slot ? img : x))));

  const reload = useCallback(async () => {
    setItems(await designerApi.listMyResponses(tab));
    setCounts(await designerApi.counts());
  }, [tab]);
  useEffect(() => {
    setItems(null);
    void reload();
  }, [reload]);

  return (
    <AppScreen header={<PlainHeader onBack={() => navigate('/pro/my')} />} tabBar={<TabBar active="my" links={DESIGNER_TABS} labels={DESIGNER_TAB_LABELS} />}>
      <ScreenTitle title="내 응답" />
      <div className="u-chips resp-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`u-chip${tab === t.key ? ' is-on' : ''}`} onClick={() => setParams({ tab: t.key }, { replace: true })}>
            {t.label} {counts?.[t.key] ?? ''}
          </button>
        ))}
      </div>
      {sent && tab === 'pending' && <Notice tone="info">응답을 보냈어요. 손님이 고르면 알려드릴게요.</Notice>}
      {items && items.length === 0 && <p className="empty">{tab === 'pending' ? '보낸 응답이 없어요. 게시판에서 요청을 둘러보세요.' : '아직 없어요.'}</p>}

      <ul className="resp-list">
        {items?.map((i) => {
          const d = describe(i);
          return (
            <li key={i.response.id} className={`my-resp${d.tone === 'muted' ? ' is-muted' : ''}`}>
              <div className="my-resp__row">
                <Thumb src={null} alt={`${i.request.styleTag} 시안`} className="card-row__thumb" />
                <div>
                  <p className={`my-resp__label my-resp__label--${d.tone}`}>
                    {(d.tone === 'brown' || d.tone === 'blue') && <img src={circleCheck} alt="" />}
                    {d.label}
                  </p>
                  <p className="card-row__title">{i.request.styleTag}</p>
                  <p className="card-row__sub">
                    {d.sub.map((s) => (
                      <span key={s}>
                        {s}
                        <br />
                      </span>
                    ))}
                  </p>
                </div>
              </div>
              {i.canRequestComplete && (
                <Button size="md" onClick={() => setCompleting(i)}>
                  시술 완료 요청
                </Button>
              )}
              {i.match?.status === 'completed' && (
                <div className="button-row">
                  {i.canReview && (
                    <Button size="md" variant="secondary" onClick={() => setReviewing(i)}>
                      손님 평가
                    </Button>
                  )}
                  <Button size="md" onClick={() => navigate('/pro/portfolio')}>
                    작업물 보기
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="info-box reg-info">{'완료 요청에 결과 사진을 첨부할 수 있어요.\n손님이 확인하면 인증 작업물로 쌓여요.'}</p>
      {picker.input}

      <BottomSheet
        open={Boolean(completing)}
        onClose={() => setCompleting(null)}
        title="시술 완료 요청"
        footer={
          <Button
            onClick={async () => {
              if (!completing?.match) return;
              try {
                await designerApi.requestComplete(completing.match.id, photos.filter((p): p is string => Boolean(p)));
                setCompleting(null);
                setPhotos([undefined, undefined]);
                await reload();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            완료 요청 보내기
          </Button>
        }
      >
        <p className="section-sub">결과 사진은 선택이에요 (최대 2장). 손님이 7일 안에 확인하지 않으면 자동으로 완료돼요.</p>
        <div className="result-shots">
          {['정면', '옆·뒤'].map((label, i) => (
            <figure key={label}>
              <PhotoCard
                image={photos[i]}
                alt={`결과 사진 ${label}`}
                size="sm"
                onPick={() => {
                  setSlot(i);
                  picker.open();
                }}
              />
              <figcaption>{label}</figcaption>
            </figure>
          ))}
        </div>
        {error && <Notice tone="error">{error}</Notice>}
      </BottomSheet>

      <BottomSheet
        open={Boolean(reviewing)}
        onClose={() => setReviewing(null)}
        title="손님은 약속을 지켰나요?"
        footer={
          <Button
            disabled={!promise}
            onClick={async () => {
              if (!reviewing?.match || !promise) return;
              await designerApi.reviewCustomer(reviewing.match.id, promise);
              setReviewing(null);
              setPromise(null);
              await reload();
            }}
          >
            남기기
          </Button>
        }
      >
        <ChipSelect label="약속 이행" value={promise} options={PROMISE} onChange={setPromise} />
        <p className="section-sub dispute-note">손님 온도에만 반영되고, 손님에게 따로 보이지 않아요.</p>
      </BottomSheet>
    </AppScreen>
  );
}
