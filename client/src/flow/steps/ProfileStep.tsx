import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  DAMAGE_LABELS,
  DENSITY_LABELS,
  TEXTURE_LABELS,
  TREATMENT_LABELS,
  type AnalyzedField,
  type FieldEstimate,
  type HairAnalysis,
  type HairProfile,
  type Treatment,
  type TreatmentType,
} from '@iroke/shared';
import { BottomSheet, Button, Calendar, ChipSelect, FieldButton, Notice, PhotoCard, PillButton, RangeSlider, WheelPicker } from '../../ui';
import removeIcon from '../../ui/assets/remove-row.svg';
import { ApiRequestError, api } from '../api';
import { useFlow } from '../FlowProvider';
import { LENGTH_SHORT, levelText } from '../lib/labels';
import { analysisMessage, type ClientErrorCode } from '../lib/messages';
import { once } from '../lib/once';
import { confirmProfile, editedFields } from '../lib/profile';
import { clearSavedProfile, loadSavedProfile, saveProfile } from '../lib/storage';
import { FlowScreen } from '../ui/FlowScreen';

const opts = <K extends string | number>(labels: Record<K, string>, keys: K[]) => keys.map((value) => ({ value, label: labels[value] }));

const LENGTH_OPTIONS = opts(LENGTH_SHORT, ['short', 'bob', 'medium', 'long']);
const TEXTURE_OPTIONS = opts(TEXTURE_LABELS, ['straight', 'wavy', 'curly']);
const DENSITY_OPTIONS = opts(DENSITY_LABELS, ['low', 'medium', 'high']);
const DAMAGE_OPTIONS = ([1, 2, 3, 4, 5] as const).map((value) => ({ value, label: DAMAGE_LABELS[value]! }));
// 시술 종류는 지금 타입(커트·펌·염색·탈색)을 따른다. 디자인의 매직·클리닉은 타입·프롬프트를 바꿔야 해서 보류
const TREATMENT_OPTIONS = opts(TREATMENT_LABELS, ['cut', 'perm', 'color', 'bleach']);

const today = () => new Date().toISOString().slice(0, 10);
const slashDate = (iso: string) => iso.replaceAll('-', '/');

/**
 * 항목별 상태.
 * - ai: AI 요약 한 줄
 * - check: 확신 낮음 → 빨간 '확인 필요' 문구 (근거)
 * - undetermined: 판별 불가 → 직접 골라야 다음으로
 */
type FieldState = { kind: 'none' } | { kind: 'ai' | 'check' | 'undetermined'; text: string };

function fieldState(estimate: FieldEstimate<unknown> | undefined, touched: boolean): FieldState {
  if (!estimate) return { kind: 'none' };
  if (estimate.undetermined && !touched) return { kind: 'undetermined', text: '사진으로 판별할 수 없어요. 직접 골라 주세요.' };
  if (estimate.confidence === 'low' && !touched) return { kind: 'check', text: estimate.reason };
  return { kind: 'ai', text: estimate.reason };
}

function Field({ title, extra, state, children }: { title: string; extra?: ReactNode; state: FieldState; children: ReactNode }) {
  return (
    <section className="hair-field">
      <h2 className="section-title">
        {title}
        {extra && <span className="hair-field__extra">{extra}</span>}
      </h2>
      {state.kind === 'ai' && <p className="section-sub">AI 요약 - {state.text}</p>}
      {(state.kind === 'check' || state.kind === 'undetermined') && <Notice tone="error">{state.text}</Notice>}
      <div className="hair-field__control">{children}</div>
    </section>
  );
}

type Sheet = { kind: 'type' | 'date'; index: number } | null;

/** 2/6 모발확인 (Figma 459:417 체크1 · 459:462 체크2 · 459:488 이력추가 · 459:957 종류 시트 · 459:821 날짜 시트) */
export function ProfileStep() {
  const { state, dispatch } = useFlow();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const part = params.get('part') === '2' ? 2 : 1;
  const [phase, setPhase] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorCode, setErrorCode] = useState<ClientErrorCode>('analysis_failed');
  const [attempt, setAttempt] = useState(0);
  const [savedDeleted, setSavedDeleted] = useState(false);
  const [touched, setTouched] = useState<Set<AnalyzedField>>(new Set());
  const [sheet, setSheet] = useState<Sheet>(null);
  const [draftType, setDraftType] = useState<TreatmentType>('color');
  const [draftDate, setDraftDate] = useState<string>();
  const { selfie, profile, analysis } = state;

  /** AI 분석. 결과는 초안이 되고, 시술 이력은 유지된다 (setAnalysis). 화면을 떠나면 결과를 버린다. */
  const analyze = useCallback(
    (request: Promise<HairAnalysis>, isAlive: () => boolean = () => true) => {
      setPhase('loading');
      request
        .then((a) => {
          if (!isAlive()) return;
          dispatch({ type: 'setAnalysis', analysis: a });
          setTouched(new Set());
          setPhase('idle');
        })
        .catch((err: Error) => {
          if (!isAlive()) return;
          setErrorCode(err instanceof ApiRequestError ? err.code : 'analysis_failed');
          setPhase('error');
        });
    },
    [dispatch],
  );

  // 셀카가 있고 프로필 초안이 없으면 분석을 돌린다 (같은 셀카는 한 번만 요청)
  const shouldAnalyze = Boolean(selfie) && !profile;
  useEffect(() => {
    if (!shouldAnalyze || !selfie) return;
    let alive = true;
    analyze(
      once(`hair:${state.selfieId}:${attempt}`, () => api.analyzeHair(selfie)),
      () => alive,
    );
    return () => {
      alive = false;
    };
  }, [shouldAnalyze, selfie, state.selfieId, attempt, analyze]);

  if (!profile) {
    return (
      <FlowScreen step={1} title={'모발 상태를\n분석하고 있어요.'} sub="기장·모질·숱·손상도·밝기를 보고 있어요.">
        <div className="flow-photo">
          <PhotoCard image={selfie} alt="올린 셀카" />
          {phase === 'error' ? (
            <div className="flow-error" role="alert">
              <Notice tone="error">{analysisMessage(errorCode)} 다시 시도하거나 직접 입력해서 진행할 수 있어요.</Notice>
              <div className="flow-error__actions">
                <PillButton onClick={() => setAttempt((n) => n + 1)}>다시 시도</PillButton>
                <PillButton onClick={() => dispatch({ type: 'startManual' })}>직접 입력으로 진행</PillButton>
              </div>
            </div>
          ) : (
            <p className="flow-loading" role="status">
              <span className="u-spinner" aria-hidden="true" />
              보통 5초 정도 걸려요
            </p>
          )}
        </div>
      </FlowScreen>
    );
  }

  const set = <K extends keyof HairProfile>(key: K, value: HairProfile[K]) => {
    dispatch({ type: 'updateProfile', profile: { ...profile, [key]: value } });
    if (key !== 'history') setTouched((t) => new Set(t).add(key as AnalyzedField));
  };
  const setHistory = (history: Treatment[]) => set('history', history);

  const edited = new Set(analysis ? editedFields(analysis, profile) : []);
  const st = (field: AnalyzedField) => fieldState(analysis?.[field], touched.has(field) || edited.has(field));
  const pick = <T,>(field: AnalyzedField, value: T) => (st(field).kind === 'undetermined' ? null : value);

  const part1Fields: AnalyzedField[] = ['length', 'texture', 'density', 'damage'];
  const blockedPart1 = part1Fields.some((f) => st(f).kind === 'undetermined');
  const blockedPart2 = st('currentLevel').kind === 'undetermined';
  const missingDate = profile.history.some((t) => !t.date);

  const confirm = () => {
    const profileSource = confirmProfile(analysis, profile);
    dispatch({ type: 'confirmProfile', profileSource });
    saveProfile({ profile, confirmedAt: profileSource.confirmedAt });
    // AI 원본 추정값 + 고친 항목 기록 (실패해도 진행은 막지 않는다)
    api.confirmProfile({ profile, profileSource }).catch(() => undefined);
    navigate(selfie ? '/flow/reference' : '/start');
  };

  const saved = state.profileOrigin === 'saved' ? loadSavedProfile() : null;
  const sub = analysis ? 'AI가 분석한 모발 데이터에요.\n다른 부분이 있다면 고쳐주세요.' : '내 모발 상태를 골라 주세요.\n확인한 값으로 시안을 만들어요.';

  const savedNotice = state.profileOrigin === 'saved' && (
    <div className="flow-saved">
      <Notice tone="info">
        {saved ? `${saved.confirmedAt.slice(0, 10).replaceAll('-', '.')}에 확정한 프로필이에요. ` : ''}바뀐 부분이 있으면 고쳐 주세요.
      </Notice>
      <div className="flow-error__actions">
        {selfie && (
          <PillButton disabled={phase === 'loading'} onClick={() => analyze(api.analyzeHair(selfie))}>
            {phase === 'loading' ? '분석하고 있어요…' : '이 셀카로 다시 분석'}
          </PillButton>
        )}
        {!savedDeleted ? (
          <button
            type="button"
            className="flow-text-button"
            onClick={() => {
              clearSavedProfile();
              setSavedDeleted(true);
            }}
          >
            저장된 프로필 삭제
          </button>
        ) : (
          <span className="flow-muted" role="status">
            저장된 프로필을 삭제했어요
          </span>
        )}
      </div>
      {phase === 'error' && <Notice tone="error">{analysisMessage(errorCode)} 지금 값으로 계속 진행할 수 있어요.</Notice>}
    </div>
  );

  if (part === 1) {
    return (
      <FlowScreen
        step={1}
        title={'모발 상태가 맞는지\n확인해주세요.'}
        sub={sub}
        bottom={
          <Button disabled={blockedPart1} onClick={() => setParams({ part: '2' })}>
            다음
          </Button>
        }
      >
        {savedNotice}
        <div className="hair-fields">
          <Field title="기장" state={st('length')}>
            <ChipSelect label="기장" value={pick('length', profile.length)} options={LENGTH_OPTIONS} onChange={(v) => set('length', v)} />
          </Field>
          <Field title="모질" state={st('texture')}>
            <ChipSelect label="모질" value={pick('texture', profile.texture)} options={TEXTURE_OPTIONS} onChange={(v) => set('texture', v)} />
          </Field>
          <Field title="숱" state={st('density')}>
            <ChipSelect label="숱" value={pick('density', profile.density)} options={DENSITY_OPTIONS} onChange={(v) => set('density', v)} />
          </Field>
          <Field title="손상도" state={st('damage')}>
            <ChipSelect label="손상도" value={pick('damage', profile.damage)} options={DAMAGE_OPTIONS} onChange={(v) => set('damage', v)} />
          </Field>
        </div>
      </FlowScreen>
    );
  }

  const level = profile.currentLevel ?? 4;
  const levelState = st('currentLevel');
  const openSheet = (kind: 'type' | 'date', index: number) => {
    const row = profile.history[index];
    setDraftType(row?.type ?? 'color');
    setDraftDate(row?.date || undefined);
    setSheet({ kind, index });
  };
  const applySheet = () => {
    if (!sheet) return;
    const rows = profile.history.map((h, i) =>
      i !== sheet.index ? h : sheet.kind === 'type' ? { ...h, type: draftType } : { ...h, date: draftDate ?? h.date },
    );
    setHistory(rows);
    setSheet(null);
  };

  return (
    <FlowScreen
      step={1}
      title={'모발 상태가 맞는지\n확인해주세요.'}
      sub={sub}
      onBack={() => setParams({})}
      bottom={
        <Button disabled={blockedPart2 || missingDate} onClick={confirm}>
          이 내용으로 확인 →
        </Button>
      }
    >
      <div className="hair-fields">
        <Field
          title="현재 밝기"
          extra={levelState.kind === 'undetermined' ? undefined : levelText(level)}
          state={levelState.kind === 'ai' && analysis?.colorDescription ? { kind: 'ai', text: analysis.colorDescription } : levelState}
        >
          <RangeSlider
            label="현재 밝기 레벨"
            value={level}
            min={1}
            max={10}
            minLabel="1 어두움"
            maxLabel="10 밝음"
            valueText={levelText(level)}
            onChange={(v) => set('currentLevel', v)}
          />
        </Field>

        <section className="hair-field">
          <h2 className="section-title">시술이력</h2>
          <p className="section-sub">최근 펌, 염색, 탈색이 중요해요.</p>
          <div className="history">
            {profile.history.map((t, i) => (
              <div key={i} className="history__row">
                <FieldButton
                  icon="chevron"
                  className="history__type"
                  value={TREATMENT_LABELS[t.type]}
                  placeholder="종류"
                  aria-label={`${i + 1}번째 시술 종류: ${TREATMENT_LABELS[t.type]}`}
                  onClick={() => openSheet('type', i)}
                />
                <FieldButton
                  icon="calendar"
                  className="history__date"
                  value={t.date ? slashDate(t.date) : undefined}
                  placeholder="시술 날짜"
                  aria-label={`${i + 1}번째 시술 날짜: ${t.date ? slashDate(t.date) : '고르지 않음'}`}
                  onClick={() => openSheet('date', i)}
                />
                <button
                  type="button"
                  className="u-icon-button history__remove"
                  aria-label={`${i + 1}번째 시술 삭제`}
                  onClick={() => setHistory(profile.history.filter((_, k) => k !== i))}
                >
                  <img src={removeIcon} alt="" />
                </button>
              </div>
            ))}
          </div>
          {missingDate && <Notice tone="error">시술 날짜를 골라 주세요.</Notice>}
          <div className="history__add">
            <PillButton onClick={() => setHistory([...profile.history, { type: 'color', date: '' }])}>+ 추가하기</PillButton>
          </div>
        </section>
      </div>

      <BottomSheet
        open={sheet?.kind === 'type'}
        onClose={() => setSheet(null)}
        title="시술이력 선택"
        footer={<Button onClick={applySheet}>확인</Button>}
      >
        <WheelPicker label="시술 종류" value={draftType} options={TREATMENT_OPTIONS} onChange={setDraftType} />
      </BottomSheet>
      <BottomSheet
        open={sheet?.kind === 'date'}
        onClose={() => setSheet(null)}
        title="시술날짜 선택"
        footer={
          <Button disabled={!draftDate} onClick={applySheet}>
            확인
          </Button>
        }
      >
        <Calendar value={draftDate} max={today()} onChange={setDraftDate} />
      </BottomSheet>
    </FlowScreen>
  );
}
