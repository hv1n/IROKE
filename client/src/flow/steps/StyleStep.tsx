import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Notice, PhotoCard, PillButton } from '../../ui';
import chevronIcon from '../../ui/assets/chevron-left-gray.svg';
import pencilIcon from '../../ui/assets/pencil.svg';
import { ApiRequestError, api } from '../api';
import { useFlow } from '../FlowProvider';
import { analysisMessage, type ClientErrorCode } from '../lib/messages';
import { once } from '../lib/once';
import { FlowScreen } from '../ui/FlowScreen';

const STYLE_TAG_MAX = 30;

type Item = { kind: 'suggestion' | 'similar'; index: number; tag: string; description: string; diff?: string } | { kind: 'custom' };

/**
 * 4/6 스타일 (Figma 535:3260 추천 · 535:3283 직접입력).
 * 카드 순서: 이름 후보(AI 추천) → 비슷한 스타일(최대 4개) → 직접 입력. 기본은 이름 후보 1순위.
 * 추천별 예시 사진이 없어 카드에는 올린 레퍼런스를 보여 준다.
 * 비슷한 스타일을 고르면 레퍼런스 사진 대신 스타일 설명으로 시안을 만든다 (WF-3 v2 메모).
 */
export function StyleStep() {
  const { state, dispatch } = useFlow();
  const navigate = useNavigate();
  const { reference, styleAnalysis, styleSource } = state;
  const items: Item[] = [
    ...(styleAnalysis?.suggestions ?? []).map((s, index) => ({ kind: 'suggestion' as const, index, tag: s.tag, description: s.description })),
    ...(styleAnalysis?.similarStyles ?? []).map((s, index) => ({ kind: 'similar' as const, index, tag: s.tag, description: s.description, diff: s.diffFromReference })),
    { kind: 'custom' as const },
  ];
  const initialPos = () => {
    if (!styleSource) return 0;
    const found = items.findIndex(
      (it) =>
        it.kind === styleSource.chosen &&
        (it.kind === 'custom' || it.index === (it.kind === 'similar' ? styleSource.similarIndex : styleSource.suggestionIndex)),
    );
    return found < 0 ? 0 : found;
  };

  const [phase, setPhase] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorCode, setErrorCode] = useState<ClientErrorCode>('analysis_failed');
  const [attempt, setAttempt] = useState(0);
  const [pos, setPos] = useState(initialPos);
  const [custom, setCustom] = useState(styleSource?.chosen === 'custom' ? (state.styleTag ?? '') : '');
  const swipe = useRef<number | null>(null);

  // 같은 레퍼런스는 한 번만 요청한다
  useEffect(() => {
    if (styleAnalysis || !reference) return;
    let alive = true;
    setPhase('loading');
    once(`style:${state.referenceId}:${attempt}`, () => api.analyzeStyle(reference))
      .then((a) => {
        if (!alive) return;
        dispatch({ type: 'setStyleAnalysis', styleAnalysis: a });
        setPhase('idle');
      })
      .catch((err: Error) => {
        if (!alive) return;
        setErrorCode(err instanceof ApiRequestError ? err.code : 'analysis_failed');
        setPhase('error');
        setPos(0);
      });
    return () => {
      alive = false;
    };
  }, [styleAnalysis, reference, state.referenceId, attempt, dispatch]);

  const total = items.length;
  const current = items[Math.min(pos, total - 1)]!;
  const isCustom = current.kind === 'custom';
  const tag = current.kind === 'custom' ? custom.trim() : current.tag;
  const go = (d: number) => setPos((p) => Math.max(0, Math.min(total - 1, p + d)));

  const next = () => {
    if (!tag) return;
    dispatch({
      type: 'chooseStyle',
      styleTag: tag,
      styleSource:
        current.kind === 'custom'
          ? { analysis: styleAnalysis, chosen: 'custom' }
          : current.kind === 'similar'
            ? { analysis: styleAnalysis, chosen: 'similar', similarIndex: current.index }
            : { analysis: styleAnalysis, chosen: 'suggestion', suggestionIndex: current.index },
    });
    navigate('/flow/generate');
  };

  return (
    <FlowScreen
      step={3}
      title={'시안으로 만들 스타일을\n골라주세요.'}
      sub="사진의 스타일과 비슷한 스타일을 함께 추천했어요."
      bottom={
        <Button disabled={!tag || phase === 'loading'} onClick={next}>
          다음
        </Button>
      }
    >
      {phase === 'loading' ? (
        <div className="style-carousel">
          <p className="style-carousel__count">&nbsp;</p>
          <PhotoCard image={reference} alt="올린 레퍼런스 사진" size="md" />
          <p className="flow-loading" role="status">
            <span className="u-spinner" aria-hidden="true" />
            헤어스타일을 읽고 있어요
          </p>
        </div>
      ) : (
        <div
          className="style-carousel"
          role="group"
          aria-roledescription="캐러셀"
          aria-label="스타일 고르기"
          onPointerDown={(e) => (swipe.current = e.clientX)}
          onPointerUp={(e) => {
            if (swipe.current == null) return;
            const dx = e.clientX - swipe.current;
            swipe.current = null;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          }}
        >
          <p className="style-carousel__count" aria-live="polite">
            {pos + 1}/{total}
          </p>
          <div className="style-carousel__stage">
            {pos > 0 && (
              <button type="button" className="u-icon-button style-carousel__prev" aria-label="이전 스타일" onClick={() => go(-1)}>
                <img src={chevronIcon} alt="" />
              </button>
            )}
            {isCustom ? (
              <div className="photo-card photo-card--md is-empty style-carousel__custom">
                <span className="photo-card__empty">
                  <img src={pencilIcon} alt="" />
                  <span>원하는 스타일 이름을{'\n'}직접 적어 주세요</span>
                </span>
              </div>
            ) : (
              <PhotoCard image={reference} alt="올린 레퍼런스 사진" size="md" />
            )}
            {pos < total - 1 && (
              <button type="button" className="u-icon-button style-carousel__next" aria-label="다음 스타일" onClick={() => go(1)}>
                <img src={chevronIcon} alt="" />
              </button>
            )}
          </div>
          {isCustom ? (
            <>
              <p className="style-carousel__name">
                직접입력 <img src={pencilIcon} alt="" />
              </p>
              <input
                className="u-input"
                type="text"
                value={custom}
                maxLength={STYLE_TAG_MAX}
                placeholder="예: 레이어드 C컬펌"
                aria-label="스타일 이름 직접 입력"
                onChange={(e) => setCustom(e.target.value)}
              />
            </>
          ) : (
            <>
              <p className="style-carousel__name">
                {current.tag} <span className="style-carousel__tag">{current.kind === 'similar' ? '비슷한 스타일' : 'AI 추천'}</span>
              </p>
              <p className="style-carousel__desc">{current.description}</p>
              {current.kind === 'similar' && (
                <p className="style-carousel__diff">
                  사진과 다른 점: {current.diff}
                  <br />
                  사진 대신 이 설명으로 시안을 만들어요.
                </p>
              )}
            </>
          )}
          {phase === 'error' && (
            <div className="flow-error" role="alert">
              <Notice tone="error">{analysisMessage(errorCode)} 스타일 이름을 직접 입력해서 진행할 수 있어요.</Notice>
              <div className="flow-error__actions">
                <PillButton onClick={() => setAttempt((n) => n + 1)}>다시 추천받기</PillButton>
              </div>
            </div>
          )}
        </div>
      )}
    </FlowScreen>
  );
}
