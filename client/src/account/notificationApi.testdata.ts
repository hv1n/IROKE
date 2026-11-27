import type { NotificationType } from '@iroke/shared';

/** 백엔드가 만드는 알림 종류별 payload 예시 (IROKE_backend services 기준) */
export const NOTIFICATION_TYPES: [NotificationType, Record<string, unknown>][] = [
  ['new_matching_request', { requestId: 'r', styleTag: '허쉬컷', regions: ['서울 동작구'], treatmentType: 'cut', difficulty: 'low' }],
  ['new_response', { requestId: 'r', responseId: 's', styleTag: '허쉬컷' }],
  ['accepted', { requestId: 'r', matchId: 'm', styleTag: '허쉬컷' }],
  ['request_closed', { requestId: 'r', styleTag: '허쉬컷', reason: 'expired' }],
  ['deadline_soon', { requestId: 'r', styleTag: '허쉬컷', expiresAt: '2026-11-29T00:00:00.000Z' }],
  ['complete_requested', { matchId: 'm', requestId: 'r', styleTag: '허쉬컷', confirmDeadline: '2026-12-05T00:00:00.000Z' }],
  ['review_reminder', { matchId: 'm', requestId: 'r', role: 'customer' }],
  ['verification_result', { verifyStatus: 'rejected', rejectReason: '면허 사진이 흐려요' }],
];
