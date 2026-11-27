// 가위 등급과 온도. 등급은 저장하지 않고 볼 때마다 온도·완료 건수로 계산한다 (하루 1회 배치 구조 그대로).
// 기준: 온도와 완료 건수를 둘 다 넘어야 오른다. 온도가 기준 아래로 떨어지면 바로 내려간다.
import type { Satisfaction } from '@iroke/shared';
import scissorsBronze from '../ui/assets/scissors-bronze.png';
import scissorsDiamond from '../ui/assets/scissors-diamond.png';
import scissorsGold from '../ui/assets/scissors-gold.png';
import scissorsNormal from '../ui/assets/scissors-normal.png';
import scissorsSilver from '../ui/assets/scissors-silver.png';

export const START_TEMPERATURE = 36.5;

export type Grade = 'diamond' | 'gold' | 'silver' | 'bronze' | 'normal';

export interface GradeRule {
  grade: Grade;
  name: string;
  desc: string;
  icon: string;
  minTemperature: number;
  minCompleted: number;
  /** 최근 90일 이의 제기 0건이어야 함 */
  noRecentDispute?: boolean;
}

export const GRADES: GradeRule[] = [
  { grade: 'diamond', name: '다이아 가위', desc: '전설의 손', icon: scissorsDiamond, minTemperature: 42.0, minCompleted: 50, noRecentDispute: true },
  { grade: 'gold', name: '골드 가위', desc: '소문난 금손', icon: scissorsGold, minTemperature: 40.0, minCompleted: 25 },
  { grade: 'silver', name: '실버 가위', desc: '믿고 맡기는 손', icon: scissorsSilver, minTemperature: 38.5, minCompleted: 10 },
  { grade: 'bronze', name: '브론즈 가위', desc: '단골이 생기는 손', icon: scissorsBronze, minTemperature: 37.0, minCompleted: 3 },
  // 일반 가위는 낙인이 아니라 신규 디자이너 표시로 보여 준다
  { grade: 'normal', name: '신규 디자이너', desc: '차곡차곡 쌓아가는 손', icon: scissorsNormal, minTemperature: -Infinity, minCompleted: 0 },
];

export interface GradeInput {
  temperature: number;
  /** 완료된 매칭 수 (7일 미확인 자동 완료 포함) = verifiedWorkCount */
  completedCount: number;
  /** 최근 90일 이의 제기 수 (백엔드 recentDisputes90d). 모르면(undefined) 다이아는 주지 않는다 */
  recentDisputes90d?: number;
}

export function gradeOf({ temperature, completedCount, recentDisputes90d }: GradeInput): GradeRule {
  return GRADES.find(
    (g) => temperature >= g.minTemperature && completedCount >= g.minCompleted && (!g.noRecentDispute || recentDisputes90d === 0),
  )!;
}

/**
 * 시술 1건마다 바뀌는 온도 (백엔드 TEMPERATURE_DELTA와 같은 값, 실제 반영은 백엔드가 한다).
 * 기준은 만족도 5점 척도(5:+0.2 4:+0.1 3:0 2:-0.2 1:-0.4). 후기 화면은 3단계라 만족=5, 보통=3, 아쉬움=1점.
 */
export const SATISFACTION_DELTA: Record<Satisfaction, number> = { good: 0.2, ok: 0, bad: -0.4 };
/** 손님 이의 제기로 요청 종료 */
export const DISPUTE_DELTA = -0.5;
/** 7일 미확인 자동 완료: 만족도가 없으니 변화 없음 (완료 건수에는 포함) */
export const AUTO_COMPLETE_DELTA = 0;

export const addTemperature = (t: number, delta: number) => Math.round((t + delta) * 10) / 10;
