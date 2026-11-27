import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, Notice, PhotoCard, PillButton } from '../../ui';
import chevronRow from '../../ui/assets/chevron-left-row.svg';
import chevronSm from '../../ui/assets/chevron-left-sm.svg';
import { useFlow } from '../FlowProvider';
import { historyRowText, profileSummary } from '../lib/labels';
import { generationMessage } from '../lib/messages';
import { currentGeneration, inputKey } from '../lib/state';
import { FlowScreen } from '../ui/FlowScreen';

/** 가짜 퍼센트 대신 경과 시간과 단계 문구로 진행감을 준다 */
function stageText(seconds: number) {
  if (seconds < 3) return '사진과 모발 조건을 보내고 있어요';
  if (seconds < 12) return '내 모발 조건에 맞춰 헤어를 합성하고 있어요';
  if (seconds < 20) return '마무리하고 있어요';
  return '평소보다 오래 걸리고 있어요. 조금만 기다려 주세요';
}

function useElapsed(startedAt: number | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  return startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
}

/** 5/6 AI 시술 (Figma 459:766 조건확인). 완성되면 6/6 시안 화면으로 넘어간다 */
export function GenerateStep() {
  const { state, statusError, retryStatus, status, promptVersion, job, jobError, startGeneration } = useFlow();
  const navigate = useNavigate();
  const key = inputKey(state, promptVersion);
  const result = currentGeneration(state, promptVersion);
  const pending = Boolean(job);
  const error = jobError && jobError.key === key ? jobError : null;
  const elapsed = useElapsed(job?.startedAt);

  // 이 화면에서 시작한 생성이 끝나면 시안 화면으로
  const wasPending = useRef(pending);
  useEffect(() => {
    if (wasPending.current && !pending && result) navigate('/flow/card');
    wasPending.current = pending;
  }, [pending, result, navigate]);

  const { selfie, reference, profile, styleTag } = state;
  if (!selfie || !reference || !profile || !styleTag) return null;

  if (pending) {
    return (
      <FlowScreen
        step={4}
        title={'AI가 헤어를\n시술하고 있어요.'}
        sub="얼굴, 표정, 배경은 그대로 두고 헤어만 바꿔요."
        bottom={<Button disabled>시술 중… {elapsed}초</Button>}
      >
        <div className="flow-photo" role="status" aria-live="polite">
          <div className="working">
            <PhotoCard image={selfie} alt="" />
            <span className="working__shimmer" aria-hidden="true" />
          </div>
          <p className="flow-loading">
            <span className="u-spinner" aria-hidden="true" />
            {stageText(elapsed)}
          </p>
        </div>
      </FlowScreen>
    );
  }

  const rows: [string, string, string][] = [
    ['스타일', styleTag, '/flow/style'],
    ...profileSummary(profile).map(([label, value]): [string, string, string] => [label, value, label === '현재 밝기' ? '/flow/profile?part=2' : '/flow/profile']),
    ['시술 이력', historyRowText(profile), '/flow/profile?part=2'],
  ];

  return (
    <FlowScreen
      step={4}
      title={'이 조건으로 헤어스타일\n시안을 만들까요?'}
      sub="얼굴, 표정, 배경은 그대로 두고 헤어만 바꿔요."
      bottom={
        result ? (
          <Button onClick={() => navigate('/flow/card')}>만든 시안 보기 →</Button>
        ) : (
          <Button disabled={!status} onClick={startGeneration}>
            {error ? '다시 시도' : 'AI 헤어 시술 시작 →'}
          </Button>
        )
      }
    >
      {error && (
        <div className="flow-error" role="alert">
          <Notice tone="error">{generationMessage(error.code)}</Notice>
          {error.code === 'profile_not_confirmed' && (
            <div className="flow-error__actions">
              <PillButton onClick={() => navigate('/flow/profile')}>모발 프로필 확인하기</PillButton>
            </div>
          )}
        </div>
      )}
      {statusError && (
        <div className="flow-error" role="alert">
          <Notice tone="error">서버에 연결하지 못했어요.</Notice>
          <div className="flow-error__actions">
            <PillButton onClick={retryStatus}>다시 연결</PillButton>
          </div>
        </div>
      )}

      <div className="pair">
        {(
          [
            ['내 셀카', selfie, '/start'],
            ['레퍼런스', reference, '/flow/reference'],
          ] as const
        ).map(([label, image, to]) => (
          <figure key={label} className="pair__item">
            <PhotoCard image={image} alt={label} size="sm" />
            <figcaption>
              <span className="pair__label">{label}</span>
              <Link className="pair__change" to={to}>
                변경하기 <img src={chevronSm} alt="" />
              </Link>
            </figcaption>
          </figure>
        ))}
      </div>

      <ul className="summary-rows">
        {rows.map(([label, value, to]) => (
          <li key={label}>
            <Link to={to} aria-label={`${label} ${value} 변경`}>
              <span className="summary-rows__label">{label}</span>
              <span className="summary-rows__value">{value}</span>
              <img className="summary-rows__chevron" src={chevronRow} alt="" />
            </Link>
          </li>
        ))}
      </ul>
    </FlowScreen>
  );
}
