// 디자이너 쪽 목업 API. 함수·타입은 IROKE_backend api-v2와 같다 → 연결할 때 이 파일만 바꾼다.
// 이 탭(sessionStorage)에만 저장한다. 사람 사진 대신 이미지 URL은 비워 두고 화면은 자리표시로 그린다.
import {
  MARKETPLACE_LIMITS,
  type BoardDetail,
  type BoardItem,
  type BoardSort,
  type CompleteMatchResponse,
  type CreateResponseBody,
  type DesignerResponseItem,
  type DesignerResponseTab,
  type HairProfile,
  type MyResponse,
  type PortfolioItem,
  type PromiseKept,
  type UpdateDesignerBody,
  type VerificationRequest,
  type VerificationStatus,
  type VerifyStatus,
} from '@iroke/shared';
import { conditionText, hairSummary, riskWarnings } from '../customer/labels';

const KEY = 'iroke.mock.designer';
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
const id = () => crypto.randomUUID();
const wait = <T,>(value: T, ms = 250) => new Promise<T>((r) => setTimeout(() => r(structuredClone(value)), ms));

export class MockApiError extends Error {}

/** 내 디자이너 정보 (백엔드 Me.designer + 화면용 값) */
export interface MyDesigner {
  verifyStatus: VerifyStatus;
  rejectReason: string | null;
  submittedAt: string;
  regions: string[];
  shopName: string;
  bookingUrl: string;
  instagram: string | null;
  /** 면허증 사진 업로드 여부 (사진 자체는 두지 않는다) */
  licenseUploaded: boolean;
  temperature: number;
  completedCount: number;
}

interface Store {
  me: MyDesigner | null;
  board: BoardDetail[];
  /** 내 응답 (요청 id → 항목) */
  responses: DesignerResponseItem[];
  portfolio: PortfolioItem[];
}

const SAMPLE_PROFILES: HairProfile[] = [
  { length: 'medium', texture: 'wavy', density: 'medium', damage: 3, currentLevel: 4, history: [{ type: 'color', date: iso(Date.now() - 40 * DAY).slice(0, 10) }] },
  { length: 'long', texture: 'straight', density: 'high', damage: 2, currentLevel: 3, history: [] },
  { length: 'bob', texture: 'wavy', density: 'low', damage: 4, currentLevel: 7, history: [{ type: 'bleach', date: iso(Date.now() - 60 * DAY).slice(0, 10) }] },
];
const SAMPLE_TAGS = ['레이어드컷', '허쉬컷', '빌드펌'];

function hairTags(p: HairProfile) {
  return hairSummary(p).split(' · ');
}

function seedBoard(now = Date.now()): BoardDetail[] {
  return SAMPLE_PROFILES.map((profile, i) => ({
    id: `b${i + 1}`,
    styleTag: SAMPLE_TAGS[i]!,
    treatmentType: i === 2 ? 'perm' : 'cut',
    difficulty: i === 2 ? 'high' : i === 0 ? 'medium' : 'low',
    hairTags: hairTags(profile),
    budget: (['5_10', '10_15', null] as const)[i]!,
    timing: (['within_2_weeks', 'this_week', 'any'] as const)[i]!,
    regions: ['서울 동작구'],
    expiresAt: iso(now + (5 - i) * DAY),
    responseCount: [2, 0, 1][i]!,
    myResponded: false,
    status: 'open',
    card: {
      profile,
      requestText: `「${SAMPLE_TAGS[i]}」 스타일로 하고 싶어요.\n기장은 지금보다 길어질 수 없으니, 사진 기장까지만 잘라 주세요.`,
      riskWarnings: riskWarnings(profile),
    },
    designImageUrl: null,
    myResponse: null,
  }));
}

/** 내 응답 탭 예시 (진행 중·완료가 비어 보이지 않게) */
function seedResponses(now = Date.now()): DesignerResponseItem[] {
  const resp = (over: Partial<MyResponse>): MyResponse => ({
    id: id(),
    availability: 'possible',
    condition: null,
    priceMin: 70_000,
    priceMax: 90_000,
    comment: '지금 기장이면 사진처럼 충분히 나와요.',
    isOutdated: false,
    status: 'accepted',
    createdAt: iso(now - 3 * DAY),
    ...over,
  });
  return [
    {
      response: resp({}),
      request: { id: 'r-accepted', styleTag: '허쉬컷', treatmentType: 'cut' },
      match: { id: 'm-accepted', status: 'accepted', acceptedAt: iso(now - 2 * DAY), confirmDeadline: null },
      canRequestComplete: true,
      canReview: false,
    },
    {
      response: resp({ createdAt: iso(now - 12 * DAY) }),
      request: { id: 'r-done', styleTag: '레이어드컷', treatmentType: 'cut' },
      match: { id: 'm-done', status: 'completed', acceptedAt: iso(now - 11 * DAY), confirmDeadline: null },
      canRequestComplete: false,
      canReview: true,
    },
    {
      response: resp({ status: 'not_selected', priceMin: 90_000, priceMax: 120_000, createdAt: iso(now - 9 * DAY) }),
      request: { id: 'r-lost', styleTag: 'C컬펌', treatmentType: 'perm' },
      match: null,
      canRequestComplete: false,
      canReview: false,
    },
  ];
}

function load(): Store {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Store | null;
    if (s) return s;
  } catch {
    // 새로 만든다
  }
  return { me: null, board: seedBoard(), responses: seedResponses(), portfolio: [] };
}
function save(s: Store) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    console.warn('[mock] 디자이너 목업 데이터를 저장하지 못함');
  }
}

const toItem = ({ status: _s, card: _c, designImageUrl: _d, myResponse: _m, ...item }: BoardDetail): BoardItem => item;

export const designerApi = {
  /** Me.designer (없으면 미등록) */
  me(): MyDesigner | null {
    return load().me;
  },

  /** POST /api/uploads(license) + POST /api/designers/verification — 이름·면허번호는 확인에만 쓰고 저장하지 않는다 */
  async submitVerification(body: Omit<VerificationRequest, 'licenseImageKey'>, licenseImage: string): Promise<VerificationStatus> {
    if (!licenseImage) throw new MockApiError('면허증 사진을 올려 주세요.');
    if (!body.regions.length || body.regions.length > MARKETPLACE_LIMITS.regionsMax) throw new MockApiError('활동지역을 1~2곳 골라 주세요.');
    if (!/^https:\/\//.test(body.bookingUrl)) throw new MockApiError('예약링크는 https:// 로 시작해야 해요.');
    const s = load();
    const now = new Date().toISOString();
    s.me = {
      verifyStatus: 'pending',
      rejectReason: null,
      submittedAt: now,
      regions: body.regions,
      shopName: body.shopName,
      bookingUrl: body.bookingUrl,
      instagram: body.instagram ?? null,
      licenseUploaded: true,
      temperature: s.me?.temperature ?? 36.5,
      completedCount: s.me?.completedCount ?? 1,
    };
    save(s);
    return wait({ verifyStatus: 'pending', rejectReason: null, submittedAt: now, decidedAt: null });
  },

  /** PATCH /api/designers/me */
  async updateMe(body: UpdateDesignerBody): Promise<MyDesigner> {
    const s = load();
    if (!s.me) throw new MockApiError('먼저 디자이너로 등록해 주세요.');
    Object.assign(s.me, body);
    save(s);
    return wait(s.me);
  },

  /** GET /api/board?sort= (활동 지역 기준) */
  async listBoard(sort: BoardSort = 'newest'): Promise<BoardItem[]> {
    const s = load();
    const regions = s.me?.regions ?? [];
    const list = s.board.filter((b) => b.status === 'open' && (!regions.length || b.regions.some((r) => regions.includes(r))));
    const sorted = sort === 'fewest_responses' ? [...list].sort((a, b) => a.responseCount - b.responseCount) : list;
    return wait(sorted.map(toItem));
  },

  /** GET /api/board/:id — 시안 이미지는 인증 디자이너에게만 (목업은 이미지 없음) */
  async getBoard(rid: string): Promise<BoardDetail> {
    const b = load().board.find((x) => x.id === rid);
    if (!b) throw new MockApiError('요청을 찾지 못했어요.');
    return wait(b);
  },

  /** POST /api/requests/:id/responses — 같은 요청에는 한 번만 */
  async respond(rid: string, body: CreateResponseBody): Promise<MyResponse> {
    const s = load();
    if (s.me?.verifyStatus !== 'verified') throw new MockApiError('면허 인증이 끝나면 응답할 수 있어요.');
    const b = s.board.find((x) => x.id === rid);
    if (!b || b.status !== 'open') throw new MockApiError('이미 마감된 요청이에요.');
    if (b.myResponse) throw new MockApiError('이 요청에는 이미 응답했어요.');
    if (body.availability === 'conditional' && !body.condition?.trim()) throw new MockApiError('조건을 적어 주세요.');
    if (body.priceMin > body.priceMax) throw new MockApiError('가격대를 다시 확인해 주세요.');
    if (body.comment.length > MARKETPLACE_LIMITS.responseCommentMax) throw new MockApiError(`코멘트는 ${MARKETPLACE_LIMITS.responseCommentMax}자까지 쓸 수 있어요.`);
    const r: MyResponse = { id: id(), ...body, condition: body.condition ?? null, isOutdated: false, status: 'pending', createdAt: new Date().toISOString() };
    b.myResponse = r;
    b.myResponded = true;
    b.responseCount += 1;
    s.responses.unshift({ response: r, request: { id: b.id, styleTag: b.styleTag, treatmentType: b.treatmentType }, match: null, canRequestComplete: false, canReview: false });
    save(s);
    return wait(r);
  },

  /** GET /api/designers/me/responses?tab= — pending: 응답 보냄·선택 전 / in_progress: 수락·확인 대기 / done: 완료·선택 안 됨 */
  async listMyResponses(tab: DesignerResponseTab): Promise<DesignerResponseItem[]> {
    const s = load();
    const tabOf = (i: DesignerResponseItem): DesignerResponseTab =>
      i.response.status === 'pending' ? 'pending' : i.response.status === 'not_selected' || i.match?.status === 'completed' ? 'done' : 'in_progress';
    return wait(s.responses.filter((i) => tabOf(i) === tab));
  },

  /** 탭별 개수 (화면용) */
  async counts(): Promise<Record<DesignerResponseTab, number>> {
    const c: Record<DesignerResponseTab, number> = { pending: 0, in_progress: 0, done: 0 };
    for (const t of ['pending', 'in_progress', 'done'] as const) c[t] = (await this.listMyResponses(t)).length;
    return c;
  },

  /** POST /api/matches/:id/complete — 결과 사진 최대 2장, 손님이 7일 안에 확인하지 않으면 자동 완료 */
  async requestComplete(matchId: string, resultImages: string[]): Promise<CompleteMatchResponse> {
    if (resultImages.length > 2) throw new MockApiError('결과 사진은 2장까지 올릴 수 있어요.');
    const s = load();
    const item = s.responses.find((i) => i.match?.id === matchId);
    if (!item?.match || !item.canRequestComplete) throw new MockApiError('완료 요청을 할 수 없는 상태예요.');
    const confirmDeadline = iso(Date.now() + 7 * DAY);
    item.match.status = 'complete_requested';
    item.match.confirmDeadline = confirmDeadline;
    item.canRequestComplete = false;
    save(s);
    return wait({ status: 'complete_requested', confirmDeadline });
  },

  /** POST /api/matches/:id/reviews (디자이너 → 손님, 'no' = 노쇼) */
  async reviewCustomer(matchId: string, _promiseKept: PromiseKept): Promise<void> {
    const s = load();
    const item = s.responses.find((i) => i.match?.id === matchId);
    if (item) item.canReview = false;
    save(s);
    return wait(undefined);
  },

  /** GET /api/designers/:id/portfolio (내 것) — 인증 작업물은 손님이 완료를 확인하면 쌓인다 */
  async myPortfolio(): Promise<PortfolioItem[]> {
    const s = load();
    const done = s.responses.filter((i) => i.match?.status === 'completed');
    const verified: PortfolioItem[] = done.map((i) => ({
      id: `p-${i.request.id}`,
      source: 'verified',
      styleTag: i.request.styleTag,
      treatmentType: i.request.treatmentType,
      beforeCard: SAMPLE_PROFILES[0]!,
      designImageUrl: null,
      resultImageUrl: null,
      hairTags: hairTags(SAMPLE_PROFILES[0]!),
      completedAt: i.match!.acceptedAt,
    }));
    return wait([...verified, ...s.portfolio]);
  },
};

/** 게시판 목록 한 줄의 조건 문구 (동작구 · 2주 안 · 5~10만) */
export const boardCondition = (b: Pick<BoardItem, 'regions' | 'timing' | 'budget'>) => conditionText(b.regions, b.timing, b.budget);

/** 개발 모드 전용: 면허 인증 결과를 바로 정한다 (실제로는 운영자가 확인) */
export function devSetVerify(status: VerifyStatus) {
  const s = load();
  if (!s.me) return;
  s.me.verifyStatus = status;
  s.me.rejectReason = status === 'rejected' ? '면허증 글자가 흐려 확인하지 못했어요.' : null;
  save(s);
}
