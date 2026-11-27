import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import type { HairAnalysis, StyleAnalysis } from '@iroke/shared';
import { draftFromAnalysis } from '../flow/lib/profile';
import { inputKey, type FlowState } from '../flow/lib/state';

/** 사람 사진 대신 쓰는 단색 그림 (3:4) */
function placeholder(label: string, hue: number): string {
  const c = document.createElement('canvas');
  c.width = 600;
  c.height = 800;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 800);
  grad.addColorStop(0, `hsl(${hue} 25% 78%)`);
  grad.addColorStop(1, `hsl(${hue} 20% 55%)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 600, 800);
  g.fillStyle = `hsl(${hue} 30% 30%)`;
  g.beginPath();
  g.ellipse(300, 330, 170, 210, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = `hsl(${hue} 30% 82%)`;
  g.beginPath();
  g.ellipse(300, 370, 105, 135, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fff';
  g.font = '600 40px sans-serif';
  g.textAlign = 'center';
  g.fillText(label, 300, 740);
  return c.toDataURL('image/jpeg', 0.85);
}

const now = new Date().toISOString();
const ANALYSIS: HairAnalysis = {
  model: 'mock',
  analyzedAt: now,
  length: { value: 'medium', confidence: 'high', reason: '머리끝이 어깨에 닿는 길이로 보여요.' },
  texture: { value: 'wavy', confidence: 'medium', reason: '뿌리부터 중간까지 큰 굴곡 없이 곧게 내려와요.' },
  density: { value: 'medium', confidence: 'low', reason: '모발이 겹쳐 보여 숱을 정확히 확인하기 어려워요.' },
  damage: { value: 2, confidence: 'medium', reason: '머리끝이 살짝 부스스하고 건조해 보여요.' },
  currentLevel: { value: 4, confidence: 'medium', reason: '전체적으로 어두운 갈색이에요.' },
  colorDescription: '전체적으로 어두운 갈색이에요.',
  notes: '',
};
const STYLES: StyleAnalysis = {
  model: 'mock',
  analyzedAt: now,
  suggestions: [
    { tag: '히피펌', description: '강한 웨이브와 풍성한 볼륨감이 돋보이는 중단발 스타일', confidence: 'high' },
    { tag: '레이어드컷', description: '층을 많이 내 가볍고 자연스럽게 떨어지는 스타일', confidence: 'medium' },
    { tag: '빌드펌', description: '얼굴 주변에 볼륨을 넣은 굵은 웨이브', confidence: 'low' },
  ],
};

/**
 * 개발 모드 전용: 화면 확인용 예시 상태를 이 탭에 넣고 해당 화면으로 이동한다.
 * /dev/flow?to=/flow/card&view=card · ?blank=1 이면 비운 채로 /start
 */
export default function FlowSeed() {
  const [params] = useSearchParams();
  useEffect(() => {
    sessionStorage.clear();
    const to = params.get('to') ?? '/start';
    if (params.get('blank')) return void location.replace(to);
    const selfie = placeholder('SELFIE (예시)', 20);
    const reference = placeholder('REFERENCE (예시)', 200);
    const profile = { ...draftFromAnalysis(ANALYSIS), history: [{ type: 'color' as const, date: '2026-05-21' }] };
    const base: FlowState = {
      consent: true,
      selfie,
      selfieId: 'seed-selfie',
      analysis: ANALYSIS,
      profile,
      profileOrigin: 'analysis',
      profileSource: { analysis: ANALYSIS, editedFields: [], confirmedAt: now },
      reference,
      referenceId: 'seed-ref',
      styleAnalysis: STYLES,
      styleTag: '레이어드컷',
      styleSource: { analysis: STYLES, chosen: 'suggestion', suggestionIndex: 1 },
      generations: [],
    };
    if (to.startsWith('/flow/profile')) Object.assign(base, { profileSource: undefined });
    const gen = { key: inputKey(base, 'v1')!, generationId: 'seed-gen', model: 'mock', promptVersion: 'v1' as const, latencyMs: 1200, createdAt: now };
    const withGen = to.startsWith('/flow/card') || params.get('gen');
    const { selfie: s, reference: r, generations: _g, ...rest } = base;
    sessionStorage.setItem('iroke.flow', JSON.stringify({ ...rest, generations: withGen ? [gen] : [] }));
    sessionStorage.setItem('iroke.flow.selfie', s!);
    sessionStorage.setItem('iroke.flow.reference', r!);
    if (withGen) sessionStorage.setItem('iroke.flow.gen.seed-gen', placeholder('AI 시안 (예시)', 30));
    const extra = new URLSearchParams(params);
    for (const k of ['to', 'blank', 'gen']) extra.delete(k);
    location.replace(extra.size ? `${to}${to.includes('?') ? '&' : '?'}${extra}` : to);
  }, [params]);
  return null;
}
