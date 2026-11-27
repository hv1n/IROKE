import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { BoardItem, Difficulty } from '@iroke/shared';
import { PlainHeader, RequestCardRow } from '../customer/parts';
import { dday } from '../customer/labels';
import { AppScreen, Notice, ScreenTitle, TabBar } from '../ui';
import searchIcon from '../ui/assets/search.svg';
import { VerifyNotice } from './VerifyNotice';
import { boardCondition, designerApi } from './api';
import { DESIGNER_TABS, DESIGNER_TAB_LABELS } from './tabs';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = { low: '쉬움', medium: '보통', high: '어려움' };

/** 지역 요청 게시판 (Figma 547:5293). 목록에는 공개 필드만 — 시안 이미지는 상세에서 인증 디자이너만 */
export function Board() {
  const navigate = useNavigate();
  const [items, setItems] = useState<BoardItem[] | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    designerApi
      .listBoard()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);

  const query = q.trim();
  const shown = (items ?? []).filter((b) => !query || b.styleTag.includes(query) || b.hairTags.some((t) => t.includes(query)));

  return (
    <AppScreen header={<PlainHeader onBack={() => navigate('/pro')} />} tabBar={<TabBar active="requests" links={DESIGNER_TABS} labels={DESIGNER_TAB_LABELS} />}>
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
      {error && <Notice tone="error">{error}</Notice>}
      {items === null && !error && (
        <p className="flow-loading" role="status">
          <span className="u-spinner" aria-hidden="true" />
          요청을 불러오고 있어요
        </p>
      )}
      {items && shown.length === 0 && <p className="empty">{query ? `‘${query}’에 맞는 요청이 없어요.` : '아직 내 지역에 올라온 요청이 없어요.'}</p>}
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
    </AppScreen>
  );
}
