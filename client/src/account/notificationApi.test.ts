import { describe, expect, it } from 'vitest';
import { NOTIFICATION_TYPES } from './notificationApi.testdata';
import { describeNotification, timeAgo } from './notificationApi';

const base = { id: 'n1', readAt: null, createdAt: '2026-11-28T00:00:00.000Z' };

describe('describeNotification', () => {
  it('모든 알림 종류에 문구와 이동 경로가 있다', () => {
    for (const [type, payload] of NOTIFICATION_TYPES) {
      const v = describeNotification({ ...base, type, payload });
      expect(v.title, type).toBeTruthy();
      expect(v.to.startsWith('/'), type).toBe(true);
      expect(v.to, type).not.toContain('undefined');
    }
  });
  it('요청 마감 사유별 문구', () => {
    const t = (reason: string) => describeNotification({ ...base, type: 'request_closed', payload: { requestId: 'r', styleTag: 'x', reason } }).title;
    expect(t('other_accepted')).toBe('다른 디자이너가 선택됐어요');
    expect(t('cancelled')).toBe('손님이 요청을 내렸어요');
  });
  it('후기 알림은 역할에 따라 다른 화면으로', () => {
    const to = (role: string) => describeNotification({ ...base, type: 'review_reminder', payload: { matchId: 'm', requestId: 'r', role } }).to;
    expect(to('customer')).toBe('/matches/m/review');
    expect(to('designer')).toBe('/pro/responses?tab=done');
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-11-28T12:00:00.000Z');
  it('분·시간·일·날짜', () => {
    expect(timeAgo('2026-11-28T11:59:40.000Z', now)).toBe('방금');
    expect(timeAgo('2026-11-28T11:30:00.000Z', now)).toBe('30분 전');
    expect(timeAgo('2026-11-28T09:00:00.000Z', now)).toBe('3시간 전');
    expect(timeAgo('2026-11-26T12:00:00.000Z', now)).toBe('2일 전');
    expect(timeAgo('2026-11-01T12:00:00.000Z', now)).toMatch(/^11\.\d+$/);
  });
});
