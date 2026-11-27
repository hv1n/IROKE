// 디자이너 구하기 화면 라벨·계산 (백엔드 api-v2 값 → 화면 문구)
import {
  DAMAGE_LABELS,
  TEXTURE_LABELS,
  TREATMENT_LABELS,
  type Availability,
  type Budget,
  type HairProfile,
  type ResponseSort,
  type Timing,
} from '@iroke/shared';
import { LENGTH_SHORT } from '../flow/lib/labels';
import { RECENT_TREATMENT_DAYS } from '../flow/lib/requestNote';
import scissorsDiamond from '../ui/assets/scissors-diamond.png';
import scissorsGold from '../ui/assets/scissors-gold.png';
import scissorsSilver from '../ui/assets/scissors-silver.png';
import scissorsBronze from '../ui/assets/scissors-bronze.png';
import scissorsNormal from '../ui/assets/scissors-normal.png';

export const TIMING_LABELS: Record<Timing, string> = {
  this_week: '이번 주',
  within_2_weeks: '2주 이내',
  within_month: '한 달 이내',
  any: '상관없어요',
};
const TIMING_SHORT: Record<Timing, string> = { this_week: '이번 주', within_2_weeks: '2주 안', within_month: '한 달 안', any: '시기 무관' };

/** 칩에서 null(디자이너 제안)을 다루려고 'proposal'을 쓴다 */
export type BudgetChoice = Budget | 'proposal';
export const BUDGET_LABELS: Record<BudgetChoice, string> = {
  under_5: '5만원 이내',
  '5_10': '5~10만원',
  '10_15': '10~15만원',
  over_15: '15만원 이상',
  proposal: '디자이너 제안',
};
const BUDGET_SHORT: Record<BudgetChoice, string> = { under_5: '~5만', '5_10': '5~10만', '10_15': '10~15만', over_15: '15만~', proposal: '가격 제안' };

export const AVAILABILITY_LABELS: Record<Availability, string> = { possible: '가능', conditional: '조건부 가능' };
export const SORT_LABELS: Record<ResponseSort, string> = { price_asc: '가격 낮은 순', temperature_desc: '온도 높은 순', works_desc: '작업 많은 순' };

/** '서울 동작구' → '동작구' */
const district = (region: string) => region.split(' ').slice(1).join(' ') || region;

/** 동작구 · 2주 안 · 5~10만 */
export function conditionText(regions: string[], timing: Timing, budget: Budget | null): string {
  return [regions.map(district).join(', '), TIMING_SHORT[timing], BUDGET_SHORT[budget ?? 'proposal']].join(' · ');
}

const daysSince = (iso: string, now: Date) => (now.getTime() - Date.parse(`${iso}T00:00:00`)) / 86_400_000;

/** 최근 3개월 안 염색·탈색·펌 */
export function recentTreatments(profile: HairProfile, now = new Date()): string[] {
  const recent = profile.history.filter((t) => t.date && daysSince(t.date, now) <= RECENT_TREATMENT_DAYS && t.type !== 'cut');
  return [...new Set(recent.map((t) => TREATMENT_LABELS[t.type]))];
}

/** 중단발 · 반곱슬 · 손상도 3 · 최근 염색 */
export function hairSummary(profile: HairProfile): string {
  const recent = recentTreatments(profile).map((k) => `최근 ${k}`);
  return [LENGTH_SHORT[profile.length], TEXTURE_LABELS[profile.texture], `손상도 ${profile.damage}`, ...recent].join(' · ');
}

/** 요청 카드에 붙는 사전 경고 (백엔드 riskWarnings) */
export function riskWarnings(profile: HairProfile): string[] {
  const out = recentTreatments(profile).map((k) => `최근 3개월 ${k}`);
  if (profile.damage >= 4) out.push(`손상도 ${profile.damage} (${DAMAGE_LABELS[profile.damage]})`);
  return out;
}

/** 7~9 만원 */
export const priceText = (min: number, max: number) => {
  const m = (won: number) => String(Math.round(won / 1000) / 10).replace(/\.0$/, '');
  return min === max ? `${m(min)} 만원` : `${m(min)}~${m(max)} 만원`;
};

/** D-5 (마감까지 남은 날). 지났으면 마감 */
export function dday(expiresAt: string, now = new Date()): string {
  const d = Math.ceil((Date.parse(expiresAt) - now.getTime()) / 86_400_000);
  return d < 0 ? '마감' : d === 0 ? 'D-DAY' : `D-${d}`;
}

/**
 * 가위 등급. 백엔드에 등급 필드가 없어 완료 매칭 수(verifiedWorkCount)로 화면에서 정한다.
 * 기준은 임시값 (디자인 예시: 1건 일반 · 6건 골드 · 12건 다이아). 만족도 반영은 백엔드 필드가 생기면.
 */
export type Grade = 'diamond' | 'gold' | 'silver' | 'bronze' | 'normal';
export const GRADES: { grade: Grade; name: string; desc: string; icon: string; min: number }[] = [
  { grade: 'diamond', name: '다이아 가위', desc: '전설의 손', icon: scissorsDiamond, min: 10 },
  { grade: 'gold', name: '골드 가위', desc: '소문난 금손', icon: scissorsGold, min: 6 },
  { grade: 'silver', name: '실버 가위', desc: '믿고 맡기는 손', icon: scissorsSilver, min: 4 },
  { grade: 'bronze', name: '브론즈 가위', desc: '단골이 생기는 손', icon: scissorsBronze, min: 2 },
  { grade: 'normal', name: '일반 가위', desc: '차곡차곡 쌓아가는 손', icon: scissorsNormal, min: 0 },
];
export const gradeOf = (verifiedWorkCount: number) => GRADES.find((g) => verifiedWorkCount >= g.min)!;
