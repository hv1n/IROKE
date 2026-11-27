import { useEffect, useState } from 'react';
import { useAuth } from '../account/AuthProvider';
import { Notice } from '../ui';
import { designerApi } from './api';

/**
 * 면허 인증 대기·반려 안내 (디자인 없음).
 * 승인·반려는 관리자 화면 없이 DB에서 바꾼다 (IROKE_backend README '면허 승인'). 바뀐 상태는 앱을 다시 열면 반영된다.
 */
export function VerifyNotice() {
  const status = useAuth().user?.designer?.verifyStatus;
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'rejected') return;
    designerApi
      .verification()
      .then((v) => setReason(v.rejectReason))
      .catch(() => undefined);
  }, [status]);

  if (!status || status === 'verified') return null;
  return (
    <div className="verify-notice">
      <Notice tone={status === 'rejected' ? 'error' : 'info'}>
        {status === 'pending' ? '면허를 확인하고 있어요. 인증이 끝나면 응답할 수 있어요.' : `인증이 반려됐어요. ${reason ?? ''} 프로필 수정에서 다시 올려 주세요.`}
      </Notice>
    </div>
  );
}
