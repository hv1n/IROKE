// 알림 (GET /notifications · POST /notifications/read). 알림은 계정 단위라 손님·디자이너 알림이 한 목록에 온다.
import { useCallback, useEffect, useState } from 'react';
import type { NotificationItem, NotificationsResponse } from '@iroke/shared';
import { useAuth } from './AuthProvider';
import { api, qs } from './v2api';

export const notificationsApi = {
  list: (cursor?: string | null) => api.get<NotificationsResponse>(`/notifications${qs({ cursor, limit: 30 })}`),
  unreadCount: async () => (await api.get<NotificationsResponse>(`/notifications${qs({ unreadOnly: true, limit: 1 })}`)).unreadCount,
  /** ids를 비우면 전체 읽음 */
  read: (ids?: string[]) => api.post<void>('/notifications/read', ids ? { ids } : {}),
};

export interface NotificationView {
  title: string;
  sub: string;
  /** 누르면 갈 화면 */
  to: string;
  /** 디자이너 쪽 알림 (화면에 작은 표시) */
  designer: boolean;
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const CLOSED_REASON: Record<string, string> = {
  cancelled: '손님이 요청을 내렸어요',
  other_accepted: '다른 디자이너가 선택됐어요',
  expired: '응답한 요청이 마감됐어요',
};

/** 알림 종류별 문구와 이동할 화면 */
export function describeNotification(n: NotificationItem): NotificationView {
  const p = n.payload;
  const style = str(p.styleTag);
  const requestId = str(p.requestId);
  const matchId = str(p.matchId);
  switch (n.type) {
    case 'new_matching_request':
      return { title: '내 지역에 새 요청이 올라왔어요', sub: style, to: `/pro/board/${requestId}`, designer: true };
    case 'new_response':
      return { title: '디자이너가 응답했어요', sub: style, to: `/requests/${requestId}/responses`, designer: false };
    case 'accepted':
      return { title: '손님이 나를 선택했어요', sub: `${style} · 예약을 마치고 시술해 주세요`, to: '/pro/responses?tab=in_progress', designer: true };
    case 'request_closed':
      return { title: CLOSED_REASON[str(p.reason)] ?? '요청이 마감됐어요', sub: style, to: '/pro/responses?tab=done', designer: true };
    case 'deadline_soon':
      return { title: '요청 마감까지 하루 남았어요', sub: style, to: '/requests', designer: false };
    case 'complete_requested':
      return { title: '디자이너가 시술 완료를 요청했어요', sub: `${style} · 시술은 잘 받으셨나요?`, to: `/matches/${matchId}/confirm`, designer: false };
    case 'review_reminder':
      return p.role === 'designer'
        ? { title: '손님 평가를 남겨 주세요', sub: '완료 후 7일 안에 남길 수 있어요', to: '/pro/responses?tab=done', designer: true }
        : { title: '디자이너 후기를 남겨 주세요', sub: '완료 후 7일 안에 남길 수 있어요', to: `/matches/${matchId}/review`, designer: false };
    case 'verification_result':
      return p.verifyStatus === 'verified'
        ? { title: '면허 인증이 끝났어요', sub: '이제 손님 요청에 응답할 수 있어요', to: '/pro/board', designer: true }
        : { title: '면허 인증이 반려됐어요', sub: str(p.rejectReason) || '프로필 수정에서 다시 올려 주세요', to: '/pro/my', designer: true };
  }
}

/** '방금 · N분 전 · N시간 전 · N일 전 · 11.28' */
export function timeAgo(iso: string, now = Date.now()): string {
  const m = Math.floor((now - Date.parse(iso)) / 60_000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  const date = new Date(iso);
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

/** 안 읽은 알림 수. 화면을 열 때와 창으로 돌아올 때 다시 읽는다 */
export function useUnreadCount(): [number, () => void] {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => {
    if (!user) return setCount(0);
    notificationsApi
      .unreadCount()
      .then(setCount)
      .catch(() => undefined);
  }, [user]);
  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);
  return [count, refresh];
}
