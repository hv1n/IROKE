import { Link } from 'react-router';
import bellIcon from '../ui/assets/bell.svg';
import { useUnreadCount } from './notificationApi';

/** 알림 버튼 (안 읽은 수 배지). 머리 오른쪽에 둔다 */
export function NotificationBell() {
  const [count] = useUnreadCount();
  return (
    <Link className="u-icon-button bell" to="/notifications" aria-label={count ? `알림, 안 읽은 알림 ${count}개` : '알림'}>
      <img src={bellIcon} alt="" width={22} height={22} />
      {count > 0 && <span className="bell__badge">{count > 99 ? '99+' : count}</span>}
    </Link>
  );
}
