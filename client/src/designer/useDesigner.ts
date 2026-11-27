import { useCallback, useEffect, useState } from 'react';
import type { Me, VerifyStatus } from '@iroke/shared';
import { useAuth } from '../account/AuthProvider';
import { designerApi } from './api';

/** 내 디자이너 정보 = Me.designer + 화면에 쓰는 값 (온도·완료 건수·반려 사유) */
export interface MyDesigner extends NonNullable<Me['designer']> {
  verifyStatus: VerifyStatus;
  rejectReason: string | null;
  temperature: number;
  /** 완료된 매칭 수 (등급 계산) */
  completedCount: number;
}

/** 미등록이면 null. refresh는 서버에서 다시 읽는다 (프로필 수정·인증 신청 뒤) */
export function useDesigner(): [MyDesigner | null, () => void] {
  const { user, refreshUser } = useAuth();
  const [extra, setExtra] = useState<Pick<MyDesigner, 'rejectReason' | 'temperature' | 'completedCount'> | null>(null);
  const [tick, setTick] = useState(0);
  const designer = user?.designer ?? null;
  const userId = user?.id;
  const status = designer?.verifyStatus;

  useEffect(() => {
    if (!userId || !status) return;
    let alive = true;
    Promise.all([designerApi.verification(), designerApi.profile(userId)])
      .then(([v, p]) => alive && setExtra({ rejectReason: v.rejectReason, temperature: p.temperature, completedCount: p.verifiedWorkCount }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [userId, status, tick]);

  const refresh = useCallback(() => {
    refreshUser().catch(() => undefined);
    setTick((n) => n + 1);
  }, [refreshUser]);

  if (!user || !designer) return [null, refresh];
  return [
    {
      ...designer,
      rejectReason: extra?.rejectReason ?? null,
      temperature: extra?.temperature ?? user.temperature,
      completedCount: extra?.completedCount ?? 0,
    },
    refresh,
  ];
}
