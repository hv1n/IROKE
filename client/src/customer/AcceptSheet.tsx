import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { ResponseCard } from '@iroke/shared';
import { BottomSheet, Button, Notice } from '../ui';
import { AVAILABILITY_LABELS, priceText } from './labels';
import { customerApi } from './api';

/**
 * 요청내역 - 디자이너확정버튼 (Figma 547:4169).
 * 수락하면 예약 링크를 새 탭으로 연다 (await 뒤 window.open은 막힐 수 있어 먼저 빈 탭을 연다).
 */
export function AcceptSheet({ response, onClose }: { response: ResponseCard | null; onClose: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const r = response;

  const accept = async () => {
    if (!r) return;
    const tab = window.open('', '_blank');
    setBusy(true);
    setError('');
    try {
      const res = await customerApi.acceptResponse(r.id);
      if (tab) {
        tab.opener = null;
        tab.location.href = res.bookingUrl;
        onClose();
        navigate('/requests', { replace: true });
      } else {
        // 팝업이 막히면 링크를 보여 준다
        setBookingUrl(res.bookingUrl);
      }
    } catch (e) {
      tab?.close();
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      open={Boolean(r)}
      onClose={onClose}
      handle
      title={
        r && (
          <>
            <span className="accent">{r.designer.nickname}</span>에게 맡길까요?
          </>
        )
      }
      footer={
        bookingUrl ? (
          <a className="btn btn--primary btn--lg" href={bookingUrl} target="_blank" rel="noopener noreferrer" onClick={() => navigate('/requests', { replace: true })}>
            예약 페이지 열기 →
          </a>
        ) : (
          <Button disabled={busy} onClick={accept}>
            예약 페이지로 이동 →
          </Button>
        )
      }
    >
      {r && (
        <>
          <p className="accept__desc">
            예약과 결제는 디자이너의 예약 페이지(네이버 예약 등)에서 진행돼요. 이로케는 서로의 연락처를 공유하지 않아요.
          </p>
          <dl className="accept__stats">
            <div>
              <dt>응답</dt>
              <dd>{AVAILABILITY_LABELS[r.availability]}</dd>
            </div>
            <div>
              <dt>예상 가격</dt>
              <dd>{priceText(r.priceMin, r.priceMax).replace(' 만원', '만 원')}</dd>
            </div>
            <div>
              <dt>온도</dt>
              <dd>{r.designer.temperature.toFixed(1)}°</dd>
            </div>
          </dl>
          {r.condition && <p className="accept__condition">조건: {r.condition}</p>}
          <ul className="accept__notes">
            <li>수락하면 요청이 진행 중으로 바뀌어요</li>
            <li>다른 디자이너에게는 마감 알림이 가요</li>
          </ul>
          {error && <Notice tone="error">{error}</Notice>}
        </>
      )}
    </BottomSheet>
  );
}
