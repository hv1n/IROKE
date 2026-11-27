// 손님 [디자이너 구하기] 목업 API.
// 함수 이름·인자·반환 타입을 IROKE_backend api-v2와 맞춰 두었다 → 연결할 때 이 파일만 실제 호출로 바꾼다.
// 목업 데이터는 이 탭(sessionStorage)에만 둔다 (사진이 들어가므로 탭을 닫으면 사라지게).
// TODO(연결): 시안 업로드 전에 얼굴 가리기(마스킹)가 필요하다. 지금 목업은 업로드하지 않는다.
import {
  MARKETPLACE_LIMITS,
  type AcceptResponseResult,
  type CloseRequestResponse,
  type ConfirmMatchBody,
  type ConfirmMatchResponse,
  type CreateRequestBody,
  type CreateRequestResponse,
  type CreateReviewResponse,
  type CustomerReviewBody,
  type DesignerPublicProfile,
  type DesignerReview,
  type Difficulty,
  type DisputeMatchBody,
  type HairProfile,
  type MatchDetail,
  type MyRequestFilter,
  type MyRequestItem,
  type Paged,
  type PortfolioItem,
  type ReopenRequestResponse,
  type RequestDetail,
  type ResponseCard,
  type ResponseSort,
  type TreatmentType,
  type UpdateRequestBody,
} from '@iroke/shared';
import { loadSavedProfile, saveProfile } from '../flow/lib/storage';
import { DISPUTE_DELTA, SATISFACTION_DELTA, addTemperature } from './grade';
import { hairSummary, recentTreatments } from './labels';

const KEY = 'iroke.mock.market';
const DAY = 86_400_000;
const wait = <T,>(value: T, ms = 250) => new Promise<T>((r) => setTimeout(() => r(structuredClone(value)), ms));

export class MockApiError extends Error {}

interface Store {
  requests: RequestDetail[];
  responses: Record<string, ResponseCard[]>;
  /** 손님이 응답 목록에서 이미 본 응답 */
  seen: string[];
  matches: Record<string, MatchDetail>;
}

const empty = (): Store => ({ requests: [], responses: {}, seen: [], matches: {} });
function load(): Store {
  try {
    return { ...empty(), ...(JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Store | null) };
  } catch {
    return empty();
  }
}
function save(s: Store) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    console.warn('[mock] 저장 공간이 부족해 목업 데이터를 저장하지 못함');
  }
}
const id = () => crypto.randomUUID();
const iso = (ms: number) => new Date(ms).toISOString();

// ── 목업 디자이너 (사진 없음: 화면은 자리표시로 그린다) ─────────────────

const DESIGNERS: (DesignerPublicProfile & { bookingUrl: string; area: string })[] = [
  { id: 'd1', nickname: '슝슝 디자이너', verified: true, shopName: '숭실헤어 상도점', area: '동작구 상도동', instagram: '@soongsil.hair_official', temperature: 37.6, reviewCount: 5, verifiedWorkCount: 6, manualWorkCount: 5, bookingUrl: 'https://example.com/booking/d1' },
  { id: 'd2', nickname: '모모 실장', verified: true, shopName: '모모헤어 사당점', area: '동작구 사당동', instagram: null, temperature: 40.4, reviewCount: 27, verifiedWorkCount: 30, manualWorkCount: 8, bookingUrl: 'https://example.com/booking/d2' },
  { id: 'd3', nickname: '하루 디자이너', verified: true, shopName: '하루살롱', area: '관악구 봉천동', instagram: '@haru.salon', temperature: 36.5, reviewCount: 1, verifiedWorkCount: 1, manualWorkCount: 2, bookingUrl: 'https://example.com/booking/d3' },
];
const designer = (did: string) => DESIGNERS.find((d) => d.id === did);

const SAMPLE_RESPONSES: { did: string; availability: 'possible' | 'conditional'; condition: string | null; min: number; max: number; comment: string }[] = [
  { did: 'd1', availability: 'possible', condition: null, min: 70_000, max: 90_000, comment: '지금 기장이면 사진처럼 충분히 나와요.' },
  { did: 'd2', availability: 'conditional', condition: '클리닉을 같이 받는 조건', min: 80_000, max: 100_000, comment: '손상도 3이라 클리닉을 같이 권해요.' },
  { did: 'd3', availability: 'conditional', condition: '앞머리 길이는 상담 후 결정', min: 90_000, max: 120_000, comment: '앞머리는 보고 조금 조절할게요.' },
];

/** 백엔드 난이도 산정기 대신 쓰는 간단한 추정 */
function guessTreatment(styleTag: string): TreatmentType {
  if (/탈색|블리치/.test(styleTag)) return 'bleach';
  if (/염색|컬러|브릿지/.test(styleTag)) return 'color';
  if (/펌/.test(styleTag)) return 'perm';
  return 'cut';
}
function guessDifficulty(profile: HairProfile, t: TreatmentType): [Difficulty, string] {
  const recent = recentTreatments(profile);
  if (profile.damage >= 4 || (t !== 'cut' && recent.includes('탈색'))) return ['high', '손상이 크거나 최근 탈색이 있어 시술 부담이 커요'];
  if (t !== 'cut' && recent.length) return ['medium', `최근 ${recent.join('·')} 이력이 있어 상담이 필요해요`];
  return ['low', '모발 상태로 보아 무리 없는 시술이에요'];
}

function toItem(r: RequestDetail): MyRequestItem {
  const { card: _c, version: _v, matchId: _m, treatmentType: _t, difficulty: _d, difficultyReason: _r, ...item } = r;
  return item;
}

function sortResponses(list: ResponseCard[], sort: ResponseSort) {
  const by: Record<ResponseSort, (a: ResponseCard, b: ResponseCard) => number> = {
    price_asc: (a, b) => a.priceMin - b.priceMin,
    temperature_desc: (a, b) => b.designer.temperature - a.designer.temperature,
    works_desc: (a, b) => b.designer.verifiedWorkCount - a.designer.verifiedWorkCount,
  };
  return [...list].sort(by[sort]);
}

function expireOld(s: Store, now = Date.now()) {
  for (const r of s.requests) if (r.status === 'open' && Date.parse(r.expiresAt) < now) r.status = 'expired';
}

// ── 손님: 요청 ──────────────────────────────────────────

export const customerApi = {
  /** POST /api/uploads + PUT 대신: 목업은 시안 사본(작은 썸네일)을 그대로 둔다 */
  async createRequest(body: Omit<CreateRequestBody, 'designImageKey'>, designImage: string): Promise<CreateRequestResponse> {
    if (!body.regions.length || body.regions.length > MARKETPLACE_LIMITS.regionsMax) throw new MockApiError('시술 지역을 1~2곳 골라 주세요.');
    const s = load();
    const now = Date.now();
    const treatmentType = guessTreatment(body.card.styleTag);
    const [difficulty, difficultyReason] = guessDifficulty(body.card.profile, treatmentType);
    const rid = id();
    const req: RequestDetail = {
      id: rid,
      styleTag: body.card.styleTag,
      designImageUrl: designImage,
      regions: body.regions,
      timing: body.timing,
      budget: body.budget,
      status: 'open',
      expiresAt: iso(now + MARKETPLACE_LIMITS.requestTtlDays * DAY),
      responseCount: SAMPLE_RESPONSES.length,
      card: body.card,
      version: 1,
      matchId: null,
      treatmentType,
      difficulty,
      difficultyReason,
    };
    // 목업: 디자이너 3명이 바로 응답한 것으로 둔다 (응답 비교 화면을 보려고)
    s.responses[rid] = SAMPLE_RESPONSES.map((r, i) => {
      const d = designer(r.did)!;
      return {
        id: id(),
        availability: r.availability,
        condition: r.condition,
        priceMin: r.min,
        priceMax: r.max,
        comment: r.comment,
        isOutdated: false,
        status: 'pending',
        createdAt: iso(now + i * 60_000),
        designer: { id: d.id, nickname: d.nickname, shopName: d.shopName!, area: d.area, temperature: d.temperature, verifiedWorkCount: d.verifiedWorkCount },
      };
    });
    s.requests.unshift(req);
    save(s);
    return wait({ id: rid, status: 'open', expiresAt: req.expiresAt, treatmentType, difficulty, difficultyReason });
  },

  /** GET /api/requests/mine?status= */
  async listMyRequests(filter?: MyRequestFilter): Promise<Paged<MyRequestItem>> {
    const s = load();
    expireOld(s);
    save(s);
    const match = (st: RequestDetail['status']) =>
      !filter || (filter === 'open' ? st === 'open' : filter === 'matched' ? st === 'matched' : ['completed', 'expired', 'cancelled'].includes(st));
    return wait({ items: s.requests.filter((r) => match(r.status)).map(toItem), nextCursor: null });
  },

  /** GET /api/requests/:id */
  async getRequest(rid: string): Promise<RequestDetail> {
    const r = load().requests.find((x) => x.id === rid);
    if (!r) throw new MockApiError('요청을 찾지 못했어요.');
    return wait(r);
  },

  /** PATCH /api/requests/:id — 조건이 바뀌면 이전 응답은 '수정 전 조건'이 된다 */
  async updateRequest(rid: string, body: UpdateRequestBody): Promise<RequestDetail> {
    const s = load();
    const r = s.requests.find((x) => x.id === rid);
    if (!r) throw new MockApiError('요청을 찾지 못했어요.');
    Object.assign(r, body, { version: r.version + 1 });
    for (const resp of s.responses[rid] ?? []) resp.isOutdated = true;
    save(s);
    return wait(r);
  },

  /** POST /api/requests/:id/close */
  async closeRequest(rid: string): Promise<CloseRequestResponse> {
    const s = load();
    const r = s.requests.find((x) => x.id === rid);
    if (!r) throw new MockApiError('요청을 찾지 못했어요.');
    r.status = 'cancelled';
    save(s);
    return wait({ id: rid, status: 'cancelled' });
  },

  /** POST /api/requests/:id/reopen */
  async reopenRequest(rid: string, body: UpdateRequestBody = {}): Promise<ReopenRequestResponse> {
    const s = load();
    const r = s.requests.find((x) => x.id === rid);
    if (!r) throw new MockApiError('요청을 찾지 못했어요.');
    Object.assign(r, body, { status: 'open', expiresAt: iso(Date.now() + MARKETPLACE_LIMITS.requestTtlDays * DAY), version: r.version + 1 });
    save(s);
    return wait({ id: rid, status: 'open', expiresAt: r.expiresAt, version: r.version });
  },

  // ── 응답 비교 · 수락 ──

  /** GET /api/requests/:id/responses?sort= */
  async listResponses(rid: string, sort: ResponseSort = 'price_asc'): Promise<Paged<ResponseCard>> {
    return wait({ items: sortResponses(load().responses[rid] ?? [], sort), nextCursor: null });
  },

  /** 확인하지 않은 응답 수 (화면용. 백엔드에서는 알림 unreadCount로 대신한다) */
  unseenCount(rid: string): number {
    const s = load();
    return (s.responses[rid] ?? []).filter((r) => !s.seen.includes(r.id)).length;
  },
  markSeen(rid: string) {
    const s = load();
    s.seen = [...new Set([...s.seen, ...(s.responses[rid] ?? []).map((r) => r.id)])];
    save(s);
  },

  /** POST /api/responses/:id/accept → 예약 링크는 여기서만 */
  async acceptResponse(responseId: string): Promise<AcceptResponseResult> {
    const s = load();
    const rid = Object.keys(s.responses).find((k) => s.responses[k]!.some((r) => r.id === responseId));
    const req = s.requests.find((r) => r.id === rid);
    if (!rid || !req) throw new MockApiError('응답을 찾지 못했어요.');
    if (req.status !== 'open') throw new MockApiError('이미 마감된 요청이에요.');
    const list = s.responses[rid]!;
    const chosen = list.find((r) => r.id === responseId)!;
    for (const r of list) r.status = r.id === responseId ? 'accepted' : 'not_selected';
    const d = designer(chosen.designer.id)!;
    const matchId = id();
    req.status = 'matched';
    req.matchId = matchId;
    const { designer: _d, ...response } = chosen;
    s.matches[matchId] = {
      id: matchId,
      status: 'accepted',
      myRole: 'customer',
      request: { id: req.id, styleTag: req.styleTag, treatmentType: req.treatmentType, difficulty: req.difficulty, card: req.card, designImageUrl: req.designImageUrl },
      response,
      designer: { id: d.id, nickname: d.nickname, shopName: d.shopName, area: d.area, temperature: d.temperature },
      customer: { id: 'me', nickname: '나', temperature: 36.5 },
      acceptedAt: iso(Date.now()),
      completeRequestedAt: null,
      confirmDeadline: null,
      autoCompleted: false,
      designerResultImageUrls: [],
      customerResultImageUrls: [],
      profilePreview: null,
      myReviewWritten: false,
      reviewDeadline: null,
    };
    save(s);
    return wait({ matchId, bookingUrl: d.bookingUrl });
  },

  // ── 디자이너 프로필 ──

  async getDesigner(did: string): Promise<DesignerPublicProfile> {
    const d = designer(did);
    if (!d) throw new MockApiError('디자이너를 찾지 못했어요.');
    const { bookingUrl: _b, ...pub } = d;
    return wait(pub);
  },

  async getPortfolio(did: string, source?: 'verified' | 'manual'): Promise<Paged<PortfolioItem>> {
    const d = designer(did);
    if (!d) return wait({ items: [], nextCursor: null });
    const before: HairProfile = { length: 'medium', texture: 'wavy', density: 'medium', damage: 3, currentLevel: 5, history: [{ type: 'color', date: '2026-09-01' }] };
    const verified: PortfolioItem[] = Array.from({ length: Math.min(d.verifiedWorkCount, 3) }, (_, i) => ({
      id: `${did}-v${i}`,
      source: 'verified',
      styleTag: ['레이어드컷', '허쉬컷', '빌드펌'][i]!,
      treatmentType: (['cut', 'cut', 'perm'] as const)[i]!,
      beforeCard: before,
      designImageUrl: null,
      resultImageUrl: null,
      hairTags: hairSummary(before).split(' · '),
      completedAt: iso(Date.now() - (i + 1) * 9 * DAY),
    }));
    const manual: PortfolioItem[] = Array.from({ length: Math.min(d.manualWorkCount, 3) }, (_, i) => ({
      id: `${did}-m${i}`,
      source: 'manual',
      styleTag: ['C컬펌', '단발 레이어드', '뿌리염색'][i]!,
      treatmentType: (['perm', 'cut', 'color'] as const)[i]!,
      beforeCard: null,
      designImageUrl: null,
      resultImageUrl: null,
      hairTags: [],
      completedAt: iso(Date.now() - (i + 2) * 20 * DAY),
    }));
    return wait({ items: [...verified, ...manual].filter((p) => !source || p.source === source), nextCursor: null });
  },

  async getReviews(did: string): Promise<Paged<DesignerReview>> {
    const d = designer(did);
    const texts = ['손상 걱정했는데 꼼꼼하게 봐주셨어요', '시안이랑 거의 똑같이 나왔어요', null, '설명이 친절했어요'];
    const items: DesignerReview[] = Array.from({ length: Math.min(d?.reviewCount ?? 0, 4) }, (_, i) => ({
      manner: 'good',
      promiseKept: i === 2 ? 'partly' : 'yes',
      satisfaction: i === 2 ? 'ok' : 'good',
      text: texts[i] ?? null,
      createdAt: iso(Date.now() - (i + 1) * 5 * DAY),
    }));
    return wait({ items, nextCursor: null });
  },

  // ── 매칭 · 완료 · 후기 ──

  async getMatch(mid: string): Promise<MatchDetail> {
    const m = load().matches[mid];
    if (!m) throw new MockApiError('매칭을 찾지 못했어요.');
    return wait(m);
  },

  /** POST /api/matches/:id/confirm — 완료 확인하면 모발 프로필이 바뀐다 */
  async confirmMatch(mid: string, body: ConfirmMatchBody): Promise<ConfirmMatchResponse> {
    const s = load();
    const m = s.matches[mid];
    if (!m || m.status !== 'complete_requested') throw new MockApiError('완료 확인을 할 수 없는 상태예요.');
    if ((body.resultImageKeys?.length ?? 0) > 2) throw new MockApiError('결과 사진은 2장까지 올릴 수 있어요.');
    m.status = 'completed';
    m.reviewDeadline = iso(Date.now() + 7 * DAY);
    const req = s.requests.find((r) => r.id === m.request.id);
    if (req) req.status = 'completed';
    const after = m.profilePreview?.after ?? m.request.card.profile;
    save(s);
    // 이 브라우저에 저장된 프로필도 바뀐 값으로 (다음 시안부터 반영)
    const saved = loadSavedProfile();
    if (saved) saveProfile({ profile: after, confirmedAt: new Date().toISOString() });
    return wait({ status: 'completed', hairProfile: after });
  },

  /** POST /api/matches/:id/dispute */
  async disputeMatch(mid: string, _body: DisputeMatchBody): Promise<void> {
    const s = load();
    const m = s.matches[mid];
    if (!m) throw new MockApiError('매칭을 찾지 못했어요.');
    m.status = 'disputed';
    m.designer.temperature = addTemperature(m.designer.temperature, DISPUTE_DELTA);
    save(s);
    return wait(undefined);
  },

  /** POST /api/matches/:id/reviews (손님 → 디자이너) */
  async reviewMatch(mid: string, body: CustomerReviewBody): Promise<CreateReviewResponse> {
    if (body.text && body.text.length > 100) throw new MockApiError('한 줄 후기는 100자까지 쓸 수 있어요.');
    const s = load();
    const m = s.matches[mid];
    if (!m) throw new MockApiError('매칭을 찾지 못했어요.');
    m.myReviewWritten = true;
    m.designer.temperature = addTemperature(m.designer.temperature, SATISFACTION_DELTA[body.satisfaction]);
    save(s);
    return wait({ reviewId: id(), targetTemperature: m.designer.temperature });
  },
};

/**
 * 개발 모드 전용: 디자이너가 시술 완료를 요청한 상태로 만든다 (손님 완료 확인 화면을 보려고).
 * 실제로는 디자이너가 POST /api/matches/:id/complete 를 부른다.
 */
export function devRequestComplete(mid: string) {
  const s = load();
  const m = s.matches[mid];
  if (!m) return;
  const now = Date.now();
  const before = m.request.card.profile;
  const today = new Date(now).toISOString().slice(0, 10);
  const after: HairProfile = { ...before, history: [...before.history, { type: m.request.treatmentType, date: today }] };
  const md = `${new Date(now).getMonth() + 1}/${new Date(now).getDate()}`;
  m.status = 'complete_requested';
  m.completeRequestedAt = iso(now);
  m.confirmDeadline = iso(now + 3 * DAY);
  m.profilePreview = {
    before,
    after,
    changes: [`시술 이력  + ${({ cut: '커트', perm: '펌', color: '염색', bleach: '탈색' } as const)[m.request.treatmentType]} (${md})`, '다음 시안부터 바뀐 프로필로 만들어요'],
  };
  save(s);
}
