import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { Landing } from './components/Landing';
import { flowRoutes } from './flow/routes';

// 개발 모드에서만 공통 컴포넌트 확인 화면을 연다 (배포 번들에는 들어가지 않음)
const UiPreview = import.meta.env.DEV ? lazy(() => import('./dev/UiPreview')) : null;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={flowRoutes.layout}>
        {flowRoutes.children.map((r) => (
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
