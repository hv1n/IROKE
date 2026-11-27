import type { ReactNode } from 'react';
import { RequireLogin } from '../customer/RequireLogin';
import { Board } from './Board';
import { BoardDetail } from './BoardDetail';
import { RequireDesigner } from './Gate';
import { DesignerHome } from './Home';
import { DesignerMy } from './My';
import { MyResponses } from './MyResponses';
import { Portfolio } from './Portfolio';
import { Register } from './Register';
import { Respond } from './Respond';
import './designer.css';

const pro = (el: ReactNode) => <RequireDesigner>{el}</RequireDesigner>;

/** 디자이너(미용사) 화면 /pro (목업 데이터). 등록 전에는 홈·등록만 열린다 */
export const designerRoutes: { path: string; element: ReactNode }[] = [
  { path: '/pro', element: <DesignerHome /> },
  { path: '/pro/register', element: <RequireLogin>{<Register />}</RequireLogin> },
  { path: '/pro/profile/edit', element: pro(<Register edit />) },
  { path: '/pro/board', element: pro(<Board />) },
  { path: '/pro/board/:id', element: pro(<BoardDetail />) },
  { path: '/pro/board/:id/respond', element: pro(<Respond />) },
  { path: '/pro/responses', element: pro(<MyResponses />) },
  { path: '/pro/my', element: pro(<DesignerMy />) },
  { path: '/pro/portfolio', element: pro(<Portfolio />) },
];
