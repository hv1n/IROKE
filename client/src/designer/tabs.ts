import type { TabKey } from '../ui';

export const DESIGNER_TABS: Record<TabKey, string> = { home: '/pro', requests: '/pro/board', my: '/pro/my' };
/** 디자인은 '요청하기'지만 디자이너는 손님 요청을 보는 탭이라 '요청보기' */
export const DESIGNER_TAB_LABELS = { requests: '요청보기' };
