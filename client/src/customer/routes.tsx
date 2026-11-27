import type { ReactNode } from 'react';
import { CardPicker } from './CardPicker';
import { DesignerProfile } from './DesignerProfile';
import { MatchConfirm } from './MatchConfirm';
import { My } from './My';
import { RequestDone } from './RequestDone';
import { RequestForm } from './RequestForm';
import { Requests } from './Requests';
import { RequireLogin } from './RequireLogin';
import { Responses } from './Responses';
import { Review } from './Review';
import './customer.css';

const gate = (el: ReactNode) => <RequireLogin>{el}</RequireLogin>;

/** 손님 디자이너 구하기·요청내역·마이 (로그인 필요, 목업 데이터) */
export const customerRoutes: { path: string; element: ReactNode }[] = [
  { path: '/designer-request', element: gate(<RequestForm />) },
  { path: '/designer-request/cards', element: gate(<CardPicker />) },
  { path: '/designer-request/done', element: gate(<RequestDone />) },
  { path: '/requests', element: gate(<Requests />) },
  { path: '/requests/:id/edit', element: gate(<RequestForm />) },
  { path: '/requests/:id/responses', element: gate(<Responses />) },
  { path: '/designers/:id', element: gate(<DesignerProfile />) },
  { path: '/matches/:id/confirm', element: gate(<MatchConfirm />) },
  { path: '/matches/:id/review', element: gate(<Review />) },
  { path: '/my', element: gate(<My />) },
];
