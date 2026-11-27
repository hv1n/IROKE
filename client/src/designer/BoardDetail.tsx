import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { BoardDetail as Detail } from '@iroke/shared';
import { PlainHeader } from '../customer/parts';
import { historyKinds, profileSummary } from '../flow/lib/labels';
import { AppScreen, Button, Notice, ScreenTitle } from '../ui';
import { DIFFICULTY_LABELS } from './Board';
import { boardCondition, designerApi } from './mockApi';

/** 요청 상세 (Figma 547:5611). 손님 6/6 카드와 같은 모양, 어두운 화면 */
export function BoardDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [b, setB] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const verified = designerApi.me()?.verifyStatus === 'verified';

  useEffect(() => {
    designerApi
      .getBoard(id)
      .then(setB)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const cells: [string, string][] = b ? [...profileSummary(b.card.profile), ['시술 이력', historyKinds(b.card.profile)]] : [];

  return (
    <AppScreen
      tone="dark"
      header={<PlainHeader light />}
      bottom={
        <div className="button-row">
          <Button variant="glass" onClick={() => navigate(-1)}>
            뒤로가기
          </Button>
          <Button disabled={!b || !verified || Boolean(b.myResponse) || b.status !== 'open'} onClick={() => navigate(`/pro/board/${id}/respond`)}>
            {b?.myResponse ? '이미 응답했어요' : '응답보내기'}
          </Button>
        </div>
      }
    >
      <ScreenTitle
        title={'고객님의 모발정보가 담긴\n전달카드 내용이에요.'}
        sub={b ? `${boardCondition(b)} · 난이도 ${DIFFICULTY_LABELS[b.difficulty]}` : '시안과 모발 상태, 요청 사항을 한 장에 담았어요.'}
      />
      {error && <Notice tone="error">{error}</Notice>}
      {b && (
        <div className="hair-card">
          <div className="hair-card__photo">
            {b.designImageUrl ? (
              <img src={b.designImageUrl} alt={`${b.styleTag} AI 시안 (얼굴 가림)`} />
            ) : (
              <span className="hair-card__placeholder">{verified ? '시안 이미지 (목업)' : '얼굴을 가린 시안은\n인증된 디자이너만 볼 수 있어요'}</span>
            )}
            <div className="hair-card__info">
              <p className="hair-card__style">{b.styleTag}</p>
              <dl className="hair-card__grid">
                {cells.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="hair-card__note">
            <p className="hair-card__note-title">요청사항</p>
            <p className="hair-card__note-text">{b.card.requestText}</p>
            {b.card.riskWarnings.length > 0 && <p className="hair-card__warn">주의: {b.card.riskWarnings.join(' · ')}</p>}
          </div>
        </div>
      )}
    </AppScreen>
  );
}
