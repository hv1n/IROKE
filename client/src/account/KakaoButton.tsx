import { useState } from 'react';
import kakaoIcon from '../ui/assets/kakao.svg';
import { useAuth } from './AuthProvider';

/** 카카오로 시작 (노란 버튼). 실패하면 아래에 한 줄 안내 */
export function KakaoButton({ returnTo, label = '카카오로 시작' }: { returnTo: string; label?: string }) {
  const { login, mode } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <button
        type="button"
        className="kakao-button"
        disabled={busy}
        onClick={async () => {
          setError('');
          setBusy(true);
          try {
            await login(returnTo);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <img src={kakaoIcon} alt="" />
        {label}
        {mode === 'dev' ? <span className="kakao-button__dev">개발용</span> : null}
      </button>
      {error && (
        <p className="kakao-button__error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
