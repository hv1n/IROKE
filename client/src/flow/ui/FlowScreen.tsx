import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { AppScreen, ScreenTitle, StepHeader } from '../../ui';
import { useFlow } from '../FlowProvider';
import { STEPS } from '../lib/steps';

interface FlowScreenProps {
  /** 0부터 (헤더에는 n/6으로 보인다) */
  step: number;
  title: ReactNode;
  sub?: ReactNode;
  bottom?: ReactNode;
  tone?: 'gray' | 'dark';
  /** 없으면 앞 단계로 (1단계는 홈) */
  onBack?: () => void;
  children?: ReactNode;
}

/** 실수로 지우지 않도록 두 번 눌러야 초기화된다 (모달 없이) */
function ResetButton() {
  const { dispatch } = useFlow();
  const navigate = useNavigate();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      className="flow-reset"
      onClick={() => {
        if (!armed) return setArmed(true);
        dispatch({ type: 'reset' });
        navigate('/start');
      }}
    >
      {armed ? '한 번 더 누르면 사진·결과 삭제' : '처음부터'}
    </button>
  );
}

/** 손님 시안 만들기 1/6~6/6 공통 틀 */
export function FlowScreen({ step, title, sub, bottom, tone = 'gray', onBack, children }: FlowScreenProps) {
  const { status } = useFlow();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const end = (
    <span className="flow-header-end">
      {status?.mode === 'mock' && (
        <span className="flow-tag" title="API 비용 없이 예시 결과를 보여 주는 개발 모드예요">
          MOCK
        </span>
      )}
      <ResetButton />
    </span>
  );

  return (
    <AppScreen
      tone={tone}
      header={
        <StepHeader
          step={step + 1}
          total={STEPS.length}
          label={STEPS[step]!.label}
          tone={tone === 'dark' ? 'dark' : 'light'}
          onBack={onBack ?? (() => navigate(step === 0 ? '/' : STEPS[step - 1]!.path))}
          end={end}
        />
      }
      bottom={bottom}
    >
      <ScreenTitle title={title} sub={sub} />
      {children}
    </AppScreen>
  );
}
