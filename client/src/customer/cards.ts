// 디자이너 구하기에 쓸 수 있는 AI 시안 카드 = 이 탭에서 만든 시안 (최대 3개, flow 상태)
import type { HairProfile, RequestCard, TreatmentType } from '@iroke/shared';
import { buildRequestNote } from '../flow/lib/requestNote';
import { inputKey, type FlowState } from '../flow/lib/state';
import { loadImage, makeCanvas } from '../flow/lib/image';
import { riskWarnings } from './labels';

export interface DraftCard {
  generationId: string;
  image: string;
  card: RequestCard;
  /** 지금 6/6에서 보던 카드 */
  current: boolean;
}

type ProfileTuple = [HairProfile['length'], HairProfile['texture'], HairProfile['density'], HairProfile['damage'], number | null, [TreatmentType, string][]];

/** inputKey(JSON)에 스타일명·프로필이 들어 있어 따로 저장하지 않고 꺼내 쓴다 */
export function draftCards(state: FlowState, promptVersion: Parameters<typeof inputKey>[1]): DraftCard[] {
  const currentKey = inputKey(state, promptVersion);
  return state.generations.flatMap((g) => {
    try {
      const [, , styleTag, p] = JSON.parse(g.key) as [string, string, string, ProfileTuple];
      const current = g.key === currentKey;
      const profile: HairProfile =
        current && state.profile
          ? state.profile
          : { length: p[0], texture: p[1], density: p[2], damage: p[3], currentLevel: p[4] ?? undefined, history: p[5].map(([type, date]) => ({ type, date })) };
      const requestText = current && state.requestNote != null ? state.requestNote : buildRequestNote(profile, styleTag);
      return [
        {
          generationId: g.generationId,
          image: g.image,
          current,
          card: {
            styleTag,
            styleSource: current && state.styleSource ? state.styleSource : { chosen: 'custom' },
            profile,
            requestText,
            riskWarnings: riskWarnings(profile),
          },
        },
      ];
    } catch {
      return [];
    }
  });
}

/** 요청 목록·디자이너 화면에 쓸 작은 사본 (긴 변 480px JPEG) */
export async function thumbnail(dataUrl: string, maxEdge = 480): Promise<string> {
  const img = await loadImage(dataUrl);
  const k = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const { canvas, ctx } = makeCanvas(Math.round(img.naturalWidth * k), Math.round(img.naturalHeight * k));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}
