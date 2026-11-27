import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { MatchDetail, MyRequestItem } from '@iroke/shared';
import { useFlow } from '../flow/FlowProvider';
import { currentGeneration } from '../flow/lib/state';
import { AppScreen, Button, Card, Modal, Notice, TabBar } from '../ui';
import sparkle from '../ui/assets/remake-other.png';
import { conditionText, dday } from './labels';
import { customerApi } from './api';
import { originalOr, unseenCount } from './local';
import { ArrowCircle, BrandHeader, Thumb } from './parts';
import { CUSTOMER_TABS } from './tabs';

const BANNER: Record<MyRequestItem['status'], string> = {
  open: '요청을 진행하고 있어요.',
  matched: '디자이너와 매칭됐어요.',
  completed: '시술이 끝났어요.',
  expired: '요청이 마감됐어요.',
  cancelled: '요청을 내렸어요.',
};

/** 요청내역 탭 (Figma 535:3373 없는상태 · 521:2239 있는상태 · 535:3646 내리기) */
export function Requests() {
  const navigate = useNavigate();
  const { state, promptVersion } = useFlow();
  const [items, setItems] = useState<MyRequestItem[] | null>(null);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [closing, setClosing] = useState(false);
  const [askNew, setAskNew] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const { items } = await customerApi.listMyRequests();
      setItems(items);
      const top = items[0];
      const detail = top ? await customerApi.getRequest(top.id) : null;
      setMatch(detail?.matchId ? await customerApi.getMatch(detail.matchId) : null);
      // 확인하지 않은 응답 수 (본 응답 id는 이 브라우저에 기록)
      const responses = top?.status === 'open' && top.responseCount > 0 ? (await customerApi.listResponses(top.id)).items : [];
      setUnseen(unseenCount(responses.map((r) => r.id)));
      // 요청이 하나도 없을 때만 바로 묻는다 (끝난 요청이 있으면 화면의 버튼으로)
      setAskNew(items.length === 0);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);

  const hasCard = Boolean(currentGeneration(state, promptVersion));
  const req = items?.[0];
  const run = (action: () => Promise<unknown>) => async () => {
    setError('');
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
    await reload();
  };

  return (
    <AppScreen tabBar={<TabBar active="requests" links={CUSTOMER_TABS} />} header={<BrandHeader />}>
      {items === null && !error && (
        <p className="flow-loading" role="status">
          <span className="u-spinner" aria-hidden="true" />
          요청내역을 불러오고 있어요
        </p>
      )}
      {error && <Notice tone="error">{error}</Notice>}

      {items && !req && (
        <div className="empty">
          <p>아직 디자이너에게 요청한 내역이 없어요.</p>
          <Button size="md" onClick={() => setAskNew(true)}>
            디자이너 구하기 →
          </Button>
        </div>
      )}

      {req && (
        <>
          <Card banner={req.status === 'open' ? BANNER.open : BANNER[req.status]} className="req-card">
            <div className="req-card__row">
              <div>
                <p className="req-card__dday">{req.status === 'open' ? dday(req.expiresAt) : ''}</p>
                <p className="req-card__title">{req.styleTag}</p>
                <p className="req-card__cond">{conditionText(req.regions, req.timing, req.budget)}</p>
              </div>
              <Thumb src={originalOr(req.id, req.designImageUrl)} alt={`${req.styleTag} AI 시안`} className="req-card__thumb" />
            </div>
            {req.status === 'open' && (
              <div className="button-row">
                <Button variant="secondary" size="md" onClick={() => setClosing(true)}>
                  내리기
                </Button>
                <Button size="md" onClick={() => navigate(`/requests/${req.id}/edit`)}>
                  수정하기
                </Button>
              </div>
            )}
            {req.status === 'expired' && req.responseCount === 0 && (
              <div className="button-row">
                <Button size="md" onClick={run(() => customerApi.reopenRequest(req.id))}>
                  다시 올리기
                </Button>
              </div>
            )}
            {(req.status === 'completed' || req.status === 'cancelled' || (req.status === 'expired' && req.responseCount > 0)) && (
              <div className="button-row">
                <Button size="md" variant="secondary" onClick={() => setAskNew(true)}>
                  새로 요청하기
                </Button>
              </div>
            )}
          </Card>

          <div className="stat-tiles">
            <section className="stat-tile">
              <h2>현재응답</h2>
              <p>
                <b>{req.responseCount}</b>곳
              </p>
            </section>
            <section className="stat-tile">
              <h2>예약상황</h2>
              <p>
                <b>{req.status === 'matched' || req.status === 'completed' ? 1 : 0}</b>곳
              </p>
            </section>
          </div>

          {match?.status === 'complete_requested' && (
            <Link className="shortcut" to={`/matches/${match.id}/confirm`}>
              <span className="shortcut__text">
                <span className="shortcut__eyebrow">시술 완료 요청</span>
                <span className="shortcut__title">시술은 잘 받으셨나요?</span>
              </span>
              <ArrowCircle />
            </Link>
          )}
          {match?.status === 'completed' && !match.myReviewWritten && (
            <Link className="shortcut" to={`/matches/${match.id}/review`}>
              <span className="shortcut__text">
                <span className="shortcut__eyebrow">후기</span>
                <span className="shortcut__title">디자이너는 어땠나요?</span>
              </span>
              <ArrowCircle />
            </Link>
          )}
          {match?.status === 'accepted' && (
            <Notice tone="info">
              <b>{match.designer.nickname}</b>에게 맡겼어요. 예약 페이지에서 예약을 마무리해 주세요.
            </Notice>
          )}

          {req.status === 'open' && (
            <>
              {unseen > 0 && (
                <Notice tone="info">
                  확인하지 않은 응답이 <b>{unseen}개</b> 있어요!
                </Notice>
              )}
              <Link className="shortcut" to={`/requests/${req.id}/responses`}>
                <img className="shortcut__art" src={sparkle} alt="" width={78} height={78} />
                <span className="shortcut__text">
                  <span className="shortcut__eyebrow">디자이너 요청</span>
                  <span className="shortcut__title">응답 보러가기</span>
                </span>
                <ArrowCircle />
              </Link>
            </>
          )}
        </>
      )}

      <Modal
        open={closing}
        onClose={() => setClosing(false)}
        layout="confirm"
        title="정말 내리시겠어요?"
        body={'내리면 디자이너들이 더 이상 이 요청을 볼 수 없고,\n지금까지 받은 응답도 사라져요.'}
        actions={
          <>
            <Button variant="secondary" onClick={() => setClosing(false)}>
              취소
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                setClosing(false);
                if (req) await run(() => customerApi.closeRequest(req.id))();
              }}
            >
              내리기
            </Button>
          </>
        }
      />

      <Modal
        open={askNew}
        onClose={() => setAskNew(false)}
        title={'현재 디자이너에게\n요청하신 내역이 없어요.'}
        body={hasCard ? '제작하신 카드로 디자이너에게\n요청을 보내시겠어요?' : 'AI 시안을 만들고\n디자이너에게 요청을 보내 보세요.'}
        actions={
          <>
            <Button size="sm" onClick={() => navigate(hasCard ? '/designer-request' : '/start')}>
              {hasCard ? '디자이너 구하기 →' : 'AI 시안 만들기 →'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAskNew(false)}>
              지금은 안할래요
            </Button>
          </>
        }
      />
    </AppScreen>
  );
}
