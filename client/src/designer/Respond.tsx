import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { MARKETPLACE_LIMITS, type Availability } from '@iroke/shared';
import { PlainHeader } from '../customer/parts';
import { AVAILABILITY_LABELS } from '../customer/labels';
import { AppScreen, Button, ChipSelect, Notice, ScreenTitle, TextField } from '../ui';
import krw from '../ui/assets/krw.svg';
import { designerApi } from './api';

const OPTIONS = (['possible', 'conditional'] as Availability[]).map((value) => ({ value, label: AVAILABILITY_LABELS[value] }));
const MAX = MARKETPLACE_LIMITS.responseCommentMax;
const won = (manwon: string) => Math.round(Number(manwon) * 10_000);

/** 응답 보내기 (Figma 547:5701). 가격은 만원 단위로 받는다 */
export function Respond() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [condition, setCondition] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const priceOk = Number(min) > 0 && Number(max) >= Number(min);
  const ready = availability && (availability === 'possible' || condition.trim()) && priceOk && comment.trim();

  const submit = async () => {
    if (!availability) return;
    setBusy(true);
    setError('');
    try {
      await designerApi.respond(id, {
        availability,
        condition: availability === 'conditional' ? condition.trim() : null,
        priceMin: won(min),
        priceMax: won(max),
        comment: comment.trim(),
      });
      navigate('/pro/responses?tab=pending', { replace: true, state: { sent: true } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const krwIcon = <img src={krw} alt="" width={20} height={20} />;
  return (
    <AppScreen
      header={<PlainHeader />}
      bottom={
        <>
          {error && <Notice tone="error">{error}</Notice>}
          <Button disabled={!ready || busy} onClick={submit}>
            응답 보내기 →
          </Button>
        </>
      }
    >
      <ScreenTitle title="응답 보내기" sub="고객님에게 응답을 보낼 수 있어요." />
      <section className="reg-section">
        <p className="u-field__label">시술 가능 여부</p>
        <ChipSelect label="시술 가능 여부" value={availability} options={OPTIONS} onChange={setAvailability} />
        {availability === 'conditional' && (
          <TextField
            className="respond-condition"
            value={condition}
            onChange={setCondition}
            maxLength={MARKETPLACE_LIMITS.conditionMax}
            placeholder="예) 2회 나눠서 시술해야 해요."
            aria-label="조건"
          />
        )}
      </section>
      <section className="reg-section">
        <p className="u-field__label">예상 가격대</p>
        <div className="price-range">
          <TextField value={min} onChange={(v) => setMin(v.replace(/[^\d.]/g, ''))} icon={krwIcon} suffix="만원" inputMode="decimal" aria-label="최소 가격 (만원)" placeholder="5" />
          <span className="price-range__dash" aria-hidden="true" />
          <TextField value={max} onChange={(v) => setMax(v.replace(/[^\d.]/g, ''))} icon={krwIcon} suffix="만원" inputMode="decimal" aria-label="최대 가격 (만원)" placeholder="10" />
        </div>
        {min && max && !priceOk && <Notice tone="error">최대 가격은 최소 가격보다 작을 수 없어요.</Notice>}
      </section>
      <section className="reg-section">
        <div className="review-text__head">
          <p className="u-field__label">한 줄 코멘트</p>
          <span className="review-text__count">
            {comment.length}/{MAX}
          </span>
        </div>
        <TextField value={comment} onChange={setComment} maxLength={MAX} placeholder="예: 손상도 3이라 클리닉을 같이 권해요" aria-label="한 줄 코멘트" />
      </section>
      <p className="info-box reg-info">{'예약 링크는 프로필에 등록한 링크가 함께 전달돼요.\n같은 요청에는 한 번만 응답할 수 있어요.'}</p>
    </AppScreen>
  );
}
