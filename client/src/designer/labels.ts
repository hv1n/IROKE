import type { BoardSort, Difficulty } from '@iroke/shared';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = { low: '쉬움', medium: '보통', high: '어려움' };
export const BOARD_SORT_LABELS: Record<BoardSort, string> = { newest: '최신순', fewest_responses: '응답 적은 순' };
