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

/**
 * 4/6 스타일 (Figma 535:3260 추천 · 535:3283 직접입력).
 * 서버 추천 3개를 1/4~3/4 카드로, 마지막 카드는 직접 입력. 추천별 예시 사진이 없어 카드에는 올린 레퍼런스를 보여 준다.
 */
export function StyleStep() {
  const { state, dispatch } = useFlow();
  const navigate = useNavigate();
  const { reference, styleAnalysis, styleSource } = state;
  const suggestions = styleAnalysis?.suggestions ?? [];

  const [phase, setPhase] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorCode, setErrorCode] = useState<ClientErrorCode>('analysis_failed');
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState<number | 'custom'>(styleSource?.chosen === 'custom' ? 'custom' : (styleSource?.suggestionIndex ?? 0));
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
        setIndex('custom');
      });
    return () => {
      alive = false;
    };
  }, [styleAnalysis, reference, state.referenceId, attempt, dispatch]);

  const total = suggestions.length + 1;
  const pos = index === 'custom' ? suggestions.length : Math.min(index, suggestions.length);
  const isCustom = pos === suggestions.length;
  const current = isCustom ? undefined : suggestions[pos];
  const tag = isCustom ? custom.trim() : current?.tag;
  const go = (d: number) => {
    const next = Math.max(0, Math.min(total - 1, pos + d));
    setIndex(next === suggestions.length ? 'custom' : next);
  };

  const next = () => {
    if (!tag) return;
    dispatch({
      type: 'chooseStyle',
      styleTag: tag,
      styleSource: isCustom ? { analysis: styleAnalysis, chosen: 'custom' } : { analysis: styleAnalysis, chosen: 'suggestion', suggestionIndex: pos },
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
            current && (
              <>
                <p className="style-carousel__name">
                  {current.tag} <span className="style-carousel__tag">AI 추천</span>
                </p>
                <p className="style-carousel__desc">{current.description}</p>
              </>
            )
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
