import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BUDGETS, DIFFICULTIES, TREATMENT_LABELS, TREATMENT_TYPES, type BoardItem, type BoardSort, type TreatmentType } from '@iroke/shared';
import { useAuth } from '../account/AuthProvider';
import { NotificationBell } from '../account/NotificationBell';
import { BUDGET_LABELS, dday } from '../customer/labels';
import { PlainHeader, RequestCardRow } from '../customer/parts';
import { AppScreen, BottomSheet, Button, ChipSelect, Notice, ScreenTitle, TabBar } from '../ui';
import searchIcon from '../ui/assets/search.svg';
import { AlertSettingsSheet } from './AlertSettingsSheet';
import { VerifyNotice } from './VerifyNotice';
import { boardCondition, designerApi, type BoardFilters } from './api';
import { BOARD_SORT_LABELS, DIFFICULTY_LABELS } from './labels';
import { DESIGNER_TABS, DESIGNER_TAB_LABELS } from './tabs';

const ALL = 'all' as const;
type All = typeof ALL;
const withAll = <T extends string>(values: readonly T[], label: (v: T) => string) => [
  { value: ALL as T | All, label: '전체' },
  ...values.map((v) => ({ value: v as T | All, label: label(v) })),
];
const district = (r: string) => r.split(' ').slice(1).join(' ') || r;

/**
 * 지역 요청 게시판 (Figma 547:5293 + WF-D2 필터·알림 설정).
 * 시술 종류는 칩으로 바로, 지역·난이도·예산·정렬은 [필터] 시트에서. 목록에는 공개 필드만 — 시안 이미지는 상세에서 인증 디자이너만
 */
export function Board() {
  const navigate = useNavigate();
  const regions = useAuth().user?.designer?.regions ?? [];
  const [items, setItems] = useState<BoardItem[] | null>(null);
  const [filters, setFilters] = useState<BoardFilters>({});
  const [draft, setDraft] = useState<BoardFilters>({});
  const [sheet, setSheet] = useState(false);
  const [alerts, setAlerts] = useState(false);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setError('');
    designerApi
      .listBoard(filters)
      .then((list) => alive && setItems(list))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [filters]);

  const query = q.trim();
  const shown = (items ?? []).filter((b) => !query || b.styleTag.includes(query) || b.hairTags.some((t) => t.includes(query)));
  const extra = [filters.region, filters.difficulty, filters.budget, filters.sort && filters.sort !== 'newest' ? filters.sort : undefined].filter(Boolean).length;
  const filtered = Boolean(filters.treatment) || extra > 0;
  const pick = <K extends keyof BoardFilters>(k: K, v: BoardFilters[K] | All) => setDraft((d) => ({ ...d, [k]: v === ALL ? undefined : v }));

  return (
    <AppScreen
      header={<PlainHeader onBack={() => navigate('/pro')} end={<NotificationBell />} />}
      tabBar={<TabBar active="requests" links={DESIGNER_TABS} labels={DESIGNER_TAB_LABELS} />}
    >
      <ScreenTitle
        title={
          <>
            내 지역 요청 <span className="accent">{items ? `${items.length}개` : ''}</span>
          </>
        }
        sub="미용실 주변에 고객님들이 올린 요청이에요."
      />
      <VerifyNotice />
      <label className="search-field">
        <img src={searchIcon} alt="" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="시술 검색" aria-label="시술 검색" />
      </label>

      <div className="board-filters">
        <div className="u-chips board-filters__kinds" role="radiogroup" aria-label="시술 종류">
          {([ALL, ...TREATMENT_TYPES] as (TreatmentType | All)[]).map((t) => {
            const on = (filters.treatment ?? ALL) === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={on}
                className={`u-chip${on ? ' is-on' : ''}`}
                onClick={() => setFilters((f) => ({ ...f, treatment: t === ALL ? undefined : t }))}
              >
                {t === ALL ? '전체' : TREATMENT_LABELS[t]}
              </button>
            );
          })}
        </div>
        <div className="board-filters__row">
          <button
            type="button"
            className={`u-chip${extra ? ' is-on' : ''}`}
            onClick={() => {
              setDraft(filters);
              setSheet(true);
            }}
          >
            필터{extra ? ` ${extra}` : ''}
          </button>
          <button type="button" className="link-button" onClick={() => setAlerts(true)}>
            알림 설정
          </button>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {items === null && !error && (
        <p className="flow-loading" role="status">
          <span className="u-spinner" aria-hidden="true" />
          요청을 불러오고 있어요
        </p>
      )}
      {items && shown.length === 0 && (
        <div className="empty">
          <p>{query ? `‘${query}’에 맞는 요청이 없어요.` : filtered ? '조건에 맞는 요청이 없어요.' : '아직 내 지역에 올라온 요청이 없어요.'}</p>
          {!query && !filtered && (
            <Button size="md" variant="secondary" onClick={() => setAlerts(true)}>
              새 요청 알림 받기
            </Button>
          )}
        </div>
      )}
      <div className="card-list">
        {shown.map((b) => (
          <RequestCardRow
            key={b.id}
            image={null}
            eyebrow={`${dday(b.expiresAt)} · 난이도 ${DIFFICULTY_LABELS[b.difficulty]}${b.myResponded ? ' · 응답함' : ''}`}
            styleTag={b.styleTag}
            summary={b.hairTags.join(' · ')}
            note={boardCondition(b)}
            onClick={() => navigate(`/pro/board/${b.id}`)}
          />
        ))}
      </div>

      <BottomSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="필터"
        footer={
          <div className="button-row">
            <Button variant="secondary" onClick={() => setDraft({ treatment: draft.treatment })}>
              초기화
            </Button>
            <Button
              onClick={() => {
                setFilters(draft);
                setSheet(false);
              }}
            >
              적용하기
            </Button>
          </div>
        }
      >
        <div className="alert-settings">
          {regions.length > 1 && (
            <section>
              <h3 className="alert-settings__title">지역</h3>
              <ChipSelect label="지역" value={draft.region ?? ALL} options={withAll(regions, district)} onChange={(v) => pick('region', v)} />
            </section>
          )}
          <section>
            <h3 className="alert-settings__title">난이도</h3>
            <ChipSelect label="난이도" value={draft.difficulty ?? ALL} options={withAll(DIFFICULTIES, (d) => DIFFICULTY_LABELS[d])} onChange={(v) => pick('difficulty', v)} />
          </section>
          <section>
            <h3 className="alert-settings__title">예산대</h3>
            <ChipSelect label="예산대" value={draft.budget ?? ALL} options={withAll(BUDGETS, (b) => BUDGET_LABELS[b])} onChange={(v) => pick('budget', v)} />
            <p className="section-sub">예산을 정하지 않은(디자이너 제안) 요청도 함께 보여요.</p>
          </section>
          <section>
            <h3 className="alert-settings__title">정렬</h3>
            <ChipSelect
              label="정렬"
              value={draft.sort ?? 'newest'}
              options={(Object.keys(BOARD_SORT_LABELS) as BoardSort[]).map((s) => ({ value: s, label: BOARD_SORT_LABELS[s] }))}
              onChange={(v) => setDraft((d) => ({ ...d, sort: v }))}
            />
          </section>
        </div>
      </BottomSheet>
      <AlertSettingsSheet open={alerts} onClose={() => setAlerts(false)} />
    </AppScreen>
  );
}
