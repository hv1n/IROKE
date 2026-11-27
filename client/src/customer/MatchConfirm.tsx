import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { MatchDetail } from '@iroke/shared';
import { AppScreen, BottomSheet, Button, Checkbox, ChipSelect, Notice, PhotoCard, ScreenTitle } from '../ui';
import { hairSummary } from './labels';
import { customerApi } from './api';
import { originalOr } from './local';
import { LoadFailed, PlainHeader, RequestCardRow } from './parts';
import { useResultPhotos } from './useResultPhotos';

const SLOTS = ['정면', '옆·뒤'] as const;
const DISPUTE = [
  { value: 'not_done' as const, label: '시술을 받지 않았어요' },
  { value: 'different' as const, label: '요청과 달라요' },
];

/**
 * 요청내역 - 시술후 (Figma 547:4406). 디자이너가 완료를 요청하면 손님이 확인한다.
 * 결과 사진은 백엔드 한도(최대 2장: 정면, 옆·뒤)에 맞춰 2칸. 올릴 때 얼굴을 가린 사본만 보낸다.
 */
export function MatchConfirm() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [m, setM] = useState<MatchDetail | null>(null);
  const shots = useResultPhotos(SLOTS.length);
  const [consent, setConsent] = useState(false);
  const [dispute, setDispute] = useState(false);
  const [reason, setReason] = useState<'not_done' | 'different' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    customerApi
      .getMatch(id)
      .then(setM)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (!m && error) return <LoadFailed message={error} />;
  if (m && m.status !== 'complete_requested')
    return <LoadFailed title="이미 처리된 요청이에요." message="완료 확인은 디자이너가 완료를 요청한 뒤 한 번만 할 수 있어요." />;

  const date = m?.completeRequestedAt ? new Date(m.completeRequestedAt) : null;
  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await customerApi.confirmMatch(id, shots.selected, consent);
      navigate(`/matches/${id}/review`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen
      header={<PlainHeader />}
      bottom={
        <>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="button-row button-row--split">
            <Button variant="secondary" onClick={() => setDispute(true)} disabled={!m || m.status !== 'complete_requested'}>
              아니에요
            </Button>
            <Button onClick={confirm} disabled={busy || shots.busy || !m || m.status !== 'complete_requested'}>
              완료 확인 →
            </Button>
          </div>
        </>
      }
    >
      <ScreenTitle
        title="시술은 잘 받으셨나요?"
        sub={m && date ? `${m.designer.nickname}님이 ${date.getMonth() + 1}월 ${date.getDate()}일 시술 완료를 요청했어요.` : undefined}
      />
      {m && (
        <>
          <RequestCardRow image={originalOr(m.request.id, m.request.designImageUrl)} styleTag={m.request.styleTag} summary={hairSummary(m.request.card.profile)} note="" />
          <section className="req-section">
            <h2 className="section-title">결과 사진</h2>
            <p className="section-sub">선택이에요. 올리면 다음 시안이 더 정확해져요.</p>
            <div className="result-shots">
              {SLOTS.map((label, i) => (
                <figure key={label}>
                  <PhotoCard image={shots.photos[i]?.image} alt={`결과 사진 ${label}`} size="sm" onPick={() => shots.pick(i)} />
                  <figcaption>{label}</figcaption>
                </figure>
              ))}
            </div>
            {shots.busy && (
              <p className="flow-loading" role="status">
                <span className="u-spinner" aria-hidden="true" />
                사진을 확인하고 있어요
              </p>
            )}
            {shots.error && <Notice tone="error">{shots.error}</Notice>}
            <div className="result-consent">
              <Checkbox checked={consent} onChange={setConsent}>
                이 사진을 디자이너 포트폴리오(인증 작업물)에 써도 괜찮아요. 얼굴은 가려서 보여줘요.
              </Checkbox>
            </div>
          </section>
          {m.profilePreview && (
            <section className="change-box">
              <p className="change-box__title">모발 프로필이 이렇게 바뀌어요</p>
              <ul>
                {m.profilePreview.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {shots.elements}

      <BottomSheet
        open={dispute}
        onClose={() => setDispute(false)}
        title="어떤 점이 다른가요?"
        footer={
          <Button
            disabled={!reason}
            onClick={async () => {
              if (!reason) return;
              try {
                await customerApi.disputeMatch(id, { reason });
                navigate('/requests', { replace: true });
              } catch (e) {
                setDispute(false);
                setError((e as Error).message);
              }
            }}
          >
            알리기
          </Button>
        }
      >
        <ChipSelect label="사유" value={reason} options={DISPUTE} onChange={setReason} />
        <p className="section-sub dispute-note">IROKE가 확인한 뒤 디자이너와 함께 처리해요.</p>
      </BottomSheet>
    </AppScreen>
  );
}
