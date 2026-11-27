import { useState } from 'react';
import { Notice } from '../ui';
import { designerApi, devSetVerify } from './mockApi';

/** 면허 인증 대기·반려 안내 (디자인 없음). 개발 모드에서는 결과를 바로 정하는 버튼 */
export function VerifyNotice({ onChange }: { onChange?: () => void }) {
  const [, force] = useState(0);
  const me = designerApi.me();
  if (!me || me.verifyStatus === 'verified') return null;
  const set = (s: 'verified' | 'rejected') => {
    devSetVerify(s);
    force((n) => n + 1);
    onChange?.();
  };
  return (
    <div className="verify-notice">
      <Notice tone={me.verifyStatus === 'rejected' ? 'error' : 'info'}>
        {me.verifyStatus === 'pending' ? '면허를 확인하고 있어요. 인증이 끝나면 응답할 수 있어요.' : `인증이 반려됐어요. ${me.rejectReason ?? ''} 프로필 수정에서 다시 올려 주세요.`}
      </Notice>
      {import.meta.env.DEV && me.verifyStatus === 'pending' && (
        <span className="flow-error__actions">
          <button type="button" className="flow-text-button" onClick={() => set('verified')}>
            (개발용) 인증 완료로
          </button>
          <button type="button" className="flow-text-button" onClick={() => set('rejected')}>
            (개발용) 반려로
          </button>
        </span>
      )}
    </div>
  );
}
