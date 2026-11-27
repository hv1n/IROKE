import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AuthProvider } from './account/AuthProvider';
import { KakaoCallback } from './account/KakaoCallback';
import { Landing } from './components/Landing';
import { customerRoutes } from './customer/routes';
import { designerRoutes } from './designer/routes';
import { flowRoutes } from './flow/routes';

// 개발 모드에서만 여는 확인용 화면 (배포 번들에는 들어가지 않음)
const UiPreview = import.meta.env.DEV ? lazy(() => import('./dev/UiPreview')) : null;
const FlowSeed = import.meta.env.DEV ? lazy(() => import('./dev/FlowSeed')) : null;

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
        {/* 시안 만들기와 디자이너 구하기는 같은 시안 상태(FlowProvider)를 쓴다 */}
        <Route element={flowRoutes.layout}>
          {[...flowRoutes.children, ...customerRoutes, ...designerRoutes].map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
        </Route>
        {UiPreview && (
          <Route
            path="/dev/ui"
            element={
              <Suspense>
                <UiPreview />
              </Suspense>
            }
          />
        )}
        {FlowSeed && (
          <Route
            path="/dev/flow"
            element={
              <Suspense>
                <FlowSeed />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
