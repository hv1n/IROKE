// 와이어프레임 v2 화면용 짧은 라벨 (칩·요약 행·카드)
import { DAMAGE_LABELS, DENSITY_LABELS, TEXTURE_LABELS, TREATMENT_LABELS, type HairLength, type HairProfile } from '@iroke/shared';

export const LENGTH_SHORT: Record<HairLength, string> = { short: '숏', bob: '단발', medium: '중단발', long: '장발' };

export const levelText = (level?: number) => (level != null ? `${level}레벨` : '모름');

const slashDate = (iso: string) => iso.replaceAll('-', '/');

/** 조건 확인 화면 시술 이력: [염색] 2026/05/21 */
export function historyRowText(profile: HairProfile): string {
  if (!profile.history.length) return '없음';
  return [...profile.history]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) => `[${TREATMENT_LABELS[t.type]}] ${slashDate(t.date)}`)
    .join(', ');
}

/** 전달 카드 시술 이력: 염색 · 커트 (최근 순, 중복 없이) */
export function historyKinds(profile: HairProfile): string {
  if (!profile.history.length) return '없음';
  const kinds = [...profile.history].sort((a, b) => b.date.localeCompare(a.date)).map((t) => TREATMENT_LABELS[t.type]);
  return [...new Set(kinds)].join(' · ');
}

/** 프로필 요약 (라벨, 값) */
export function profileSummary(profile: HairProfile): [string, string][] {
  return [
    ['기장', LENGTH_SHORT[profile.length]],
    ['모질', TEXTURE_LABELS[profile.texture]],
    ['숱', DENSITY_LABELS[profile.density]],
    ['손상도', DAMAGE_LABELS[profile.damage] ?? String(profile.damage)],
    ['현재 밝기', levelText(profile.currentLevel)],
  ];
}
