import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { NotificationItem } from '@iroke/shared';
import { PlainHeader } from '../customer/parts';
import { AppScreen, Button, Notice, ScreenTitle } from '../ui';
import { useAuth } from './AuthProvider';
import { describeNotification, notificationsApi, timeAgo } from './notificationApi';

/** 알림 목록 (디자인 없음 → 공통 컴포넌트로 구성). 누르면 읽음 처리하고 해당 화면으로 간다 */
export function Notifications() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(async (more?: string | null) => {
    try {
      const res = await notificationsApi.list(more);
      setItems((prev) => (more && prev ? [...prev, ...res.items] : res.items));
      setCursor(res.nextCursor);
      setUnread(res.unreadCount);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const open = async (n: NotificationItem) => {
    const view = describeNotification(n);
    if (!n.readAt) notificationsApi.read([n.id]).catch(() => undefined);
    // 면허 인증 결과는 내 정보(디자이너 상태)를 바꾼다
    if (n.type === 'verification_result') await refreshUser().catch(() => undefined);
    navigate(view.to);
  };

  const readAll = async () => {
    try {
      await notificationsApi.read();
      const now = new Date().toISOString();
      setItems((prev) => prev?.map((n) => (n.readAt ? n : { ...n, readAt: now })) ?? prev);
      setUnread(0);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <AppScreen
      header={
        <PlainHeader
          end={
            unread > 0 ? (
              <button type="button" className="link-button" onClick={readAll}>
                모두 읽음
              </button>
            ) : undefined
          }
        />
      }
    >
      <ScreenTitle title="알림" />
      {error && <Notice tone="error">{error}</Notice>}
      {items === null && !error && (
        <p className="flow-loading" role="status">
          <span className="u-spinner" aria-hidden="true" />
          알림을 불러오고 있어요
        </p>
      )}
      {items?.length === 0 && <p className="empty">아직 알림이 없어요.</p>}
      <ul className="noti-list">
        {items?.map((n) => {
          const v = describeNotification(n);
          return (
            <li key={n.id}>
              <button type="button" className={`noti${n.readAt ? '' : ' is-unread'}`} onClick={() => open(n)}>
                <span className="noti__text">
                  <span className="noti__title">{v.title}</span>
                  {v.sub && <span className="noti__sub">{v.sub}</span>}
                </span>
                <span className="noti__meta">
                  {v.designer && <span className="noti__role">디자이너</span>}
                  {timeAgo(n.createdAt)}
                </span>
                {!n.readAt && <span className="visually-hidden">안 읽음</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {cursor && (
        <div className="button-row">
          <Button size="md" variant="secondary" onClick={() => load(cursor)}>
            더 보기
          </Button>
        </div>
      )}
    </AppScreen>
  );
}
