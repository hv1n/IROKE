import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { RequireLogin } from '../customer/RequireLogin';
import { designerApi } from './mockApi';

/** 로그인 + 디자이너 등록이 필요한 화면. 미등록이면 디자이너 홈에서 안내 팝업 */
export function RequireDesigner({ children }: { children: ReactNode }) {
  return <RequireLogin>{designerApi.me() ? children : <Navigate to="/pro?needRegister=1" replace />}</RequireLogin>;
}
