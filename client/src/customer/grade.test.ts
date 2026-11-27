import { describe, expect, it } from 'vitest';
import { addTemperature, gradeOf, START_TEMPERATURE } from './grade';

const g = (temperature: number, completedCount: number, recentDisputes90d?: number) => gradeOf({ temperature, completedCount, recentDisputes90d }).grade;

describe('가위 등급', () => {
  it('온도와 완료 건수를 둘 다 넘어야 오른다', () => {
    expect(g(START_TEMPERATURE, 0)).toBe('normal');
    expect(g(37.1, 3)).toBe('bronze');
    expect(g(37.1, 2)).toBe('normal'); // 건수 부족
    expect(g(36.9, 30)).toBe('normal'); // 온도 부족
    expect(g(38.5, 10)).toBe('silver');
    expect(g(41.5, 25)).toBe('gold');
  });

  it('후기 1건에 높은 점수만으로는 오르지 않는다', () => {
    expect(g(45, 1)).toBe('normal');
  });

  it('다이아는 최근 90일 이의 제기 0건이 확인돼야 한다', () => {
    expect(g(46.5, 50, 0)).toBe('diamond');
    expect(g(46.5, 50, 1)).toBe('gold');
    expect(g(46.5, 50)).toBe('gold'); // 모르면 주지 않는다
  });

  it('온도가 기준 아래로 떨어지면 바로 내려간다', () => {
    expect(g(39.9, 40)).toBe('silver');
  });

  it('매번 5점이면 3·10·25·50건에 브론즈·실버·골드·다이아', () => {
    let t = START_TEMPERATURE;
    const at: Record<number, string> = {};
    for (let n = 1; n <= 50; n++) {
      t = addTemperature(t, 0.2);
      if ([3, 10, 25, 50].includes(n)) at[n] = g(t, n, 0);
    }
    expect(at).toEqual({ 3: 'bronze', 10: 'silver', 25: 'gold', 50: 'diamond' });
  });
});
