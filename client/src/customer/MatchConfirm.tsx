import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { MatchDetail } from '@iroke/shared';
import { normalizeSelfie } from '../flow/lib/image';
import { usePhotoPicker } from '../flow/ui/usePhotoPicker';
import { AppScreen, BottomSheet, Button, Checkbox, ChipSelect, Notice, PhotoCard, ScreenTitle } from '../ui';
import { hairSummary } from './labels';
import { customerApi } from './api';
import { originalOr } from './local';
import { PlainHeader, RequestCardRow } from './parts';

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
  const [photos, setPhotos] = useState<(string | undefined)[]>([undefined, undefined]);
  const [slot, setSlot] = useState(0);
  const [consent, setConsent] = useState(false);
  const [dispute, setDispute] = useState(false);
  const [reason, setReason] = useState<'not_done' | 'different' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const picker = usePhotoPicker(normalizeSelfie, (img) => setPhotos((p) => p.map((x, i) => (i === slot ? img : x))));

  useEffect(() => {
    customerApi
      .getMatch(id)
      .then(setM)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const date = m?.completeRequestedAt ? new Date(m.completeRequestedAt) : null;
  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await customerApi.confirmMatch(id, photos.filter((p): p is string => Boolean(p)), consent);
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
            <Button onClick={confirm} disabled={busy || !m || m.status !== 'complete_requested'}>
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
            {picker.error && <Notice tone="error">{picker.error}</Notice>}
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
      {picker.input}

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
