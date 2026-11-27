import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { MatchDetail, PromiseKept, ReviewManner, Satisfaction } from '@iroke/shared';
import { AppScreen, Button, ChipSelect, Notice, ScreenTitle } from '../ui';
import { customerApi } from './api';
import { PlainHeader } from './parts';

const MANNER = [
  { value: 'bad' as ReviewManner, label: '아쉬워요' },
  { value: 'ok' as ReviewManner, label: '보통이에요' },
  { value: 'good' as ReviewManner, label: '좋았어요' },
];
const PROMISE = [
  { value: 'yes' as PromiseKept, label: '네' },
  { value: 'partly' as PromiseKept, label: '일부 달랐어요' },
  { value: 'no' as PromiseKept, label: '아니요' },
];
const SATISFACTION = [
  { value: 'good' as Satisfaction, label: '만족' },
  { value: 'ok' as Satisfaction, label: '보통' },
  { value: 'bad' as Satisfaction, label: '아쉬움' },
];
const MAX = 100;

/** 요청내역 - 시술후기 (Figma 547:4590) */
export function Review() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [m, setM] = useState<MatchDetail | null>(null);
  const [manner, setManner] = useState<ReviewManner | null>(null);
  const [promise, setPromise] = useState<PromiseKept | null>(null);
  const [satisfaction, setSatisfaction] = useState<Satisfaction | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    customerApi.getMatch(id).then(setM).catch((e: Error) => setError(e.message));
  }, [id]);

  const submit = async () => {
    if (!satisfaction) return;
    try {
      await customerApi.reviewMatch(id, { satisfaction, manner: manner ?? undefined, promiseKept: promise ?? undefined, text: text.trim() || undefined });
      navigate('/requests', { replace: true });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <AppScreen
      header={<PlainHeader />}
      bottom={
        <>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="button-row button-row--split">
            <Button variant="secondary" onClick={() => navigate('/requests', { replace: true })}>
              나중에
            </Button>
            <Button disabled={!satisfaction} onClick={submit}>
              후기 남기기
            </Button>
          </div>
        </>
      }
    >
      <ScreenTitle
        title={`${m?.designer.nickname ?? '디자이너'}님은 어땠나요?`}
        sub={'디자이너 등급에는 시술 결과 만족도가 반영돼요.\n응대·약속 이행은 후기에 보여요.'}
      />
      <section className="req-section">
        <h2 className="section-title">응대는 어땠나요?</h2>
        <div className="req-chips">
          <ChipSelect label="응대" value={manner} options={MANNER} onChange={setManner} />
        </div>
      </section>
      <section className="req-section">
        <h2 className="section-title">응답한 내용과 가격이 지켜졌나요?</h2>
        <div className="req-chips">
          <ChipSelect label="약속 이행" value={promise} options={PROMISE} onChange={setPromise} />
        </div>
      </section>
      <section className="req-section">
        <h2 className="section-title">결과는 만족스러운가요?</h2>
        <div className="req-chips">
          <ChipSelect label="결과 만족도" value={satisfaction} options={SATISFACTION} onChange={setSatisfaction} />
        </div>
      </section>
      <section className="req-section">
        <div className="review-text__head">
          <h2 className="section-title">한 줄 후기</h2>
          <span className="review-text__count">
            {text.length}/{MAX}
          </span>
        </div>
        <textarea
          className="review-text"
          rows={3}
          maxLength={MAX}
          value={text}
          placeholder="예: 손상 걱정했는데 꼼꼼하게 봐주셨어요"
          aria-label="한 줄 후기"
          onChange={(e) => setText(e.target.value)}
        />
      </section>
    </AppScreen>
  );
}
