// 디자이너 쪽 API (IROKE_backend api-v2).
// 디자이너 여부·인증 상태는 로그인 정보(Me.designer)에 있다 → useAuth().user.designer / useDesigner
import type {
  BoardDetail,
  BoardItem,
  BoardSort,
  CompleteMatchResponse,
  CreateResponseBody,
  CreateReviewResponse,
  DesignerPublicProfile,
  DesignerResponseItem,
  DesignerResponseTab,
  Me,
  Paged,
  PortfolioItem,
  PromiseKept,
  UpdateDesignerBody,
  VerificationRequest,
  VerificationStatus,
} from '@iroke/shared';
import { uploadImage, uploadResultPhotos, type ResultPhoto } from '../account/upload';
import { api, qs } from '../account/v2api';
import { conditionText } from '../customer/labels';

const LIMIT = 50;
const TABS: DesignerResponseTab[] = ['pending', 'in_progress', 'done'];

export const designerApi = {
  /** 면허증 사진(얼굴 가림 없음, 승인 뒤 서버가 삭제)을 올리고 인증 신청. 이름·면허번호는 대조에만 쓰고 저장하지 않는다 */
  async submitVerification(body: Omit<VerificationRequest, 'licenseImageKey'>, licenseImage: string): Promise<void> {
    const licenseImageKey = await uploadImage('license', licenseImage);
    await api.post<{ verifyStatus: 'pending' }>('/designers/verification', { ...body, licenseImageKey });
  },
  verification: () => api.get<VerificationStatus>('/designers/verification'),
  updateMe: (body: UpdateDesignerBody) => api.patch<NonNullable<Me['designer']>>('/designers/me', body),
  profile: (id: string) => api.get<DesignerPublicProfile>(`/designers/${id}`),

  /** 내 활동 지역 게시판 */
  async listBoard(sort: BoardSort = 'newest'): Promise<BoardItem[]> {
    return (await api.get<Paged<BoardItem>>(`/board${qs({ sort, limit: LIMIT })}`)).items;
  },
  /** 시안(얼굴 가린 사본)은 인증 디자이너에게만 내려온다 */
  getBoard: (requestId: string) => api.get<BoardDetail>(`/board/${requestId}`),
  /** 같은 요청에는 한 번만 */
  respond: (requestId: string, body: CreateResponseBody) => api.post<{ id: string }>(`/requests/${requestId}/responses`, body),

  async listMyResponses(tab: DesignerResponseTab): Promise<DesignerResponseItem[]> {
    return (await api.get<Paged<DesignerResponseItem>>(`/designers/me/responses${qs({ tab, limit: LIMIT })}`)).items;
  },
  /** 탭별 개수 (화면용) */
  async counts(): Promise<Record<DesignerResponseTab, number>> {
    const lists = await Promise.all(TABS.map((t) => designerApi.listMyResponses(t)));
    return Object.fromEntries(TABS.map((t, i) => [t, lists[i]!.length])) as Record<DesignerResponseTab, number>;
  },

  /** 완료 요청. 결과 사진(최대 2장)은 얼굴을 가린 사본으로 올린다. 손님이 7일 안에 확인하지 않으면 자동 완료 */
  async requestComplete(matchId: string, photos: ResultPhoto[]): Promise<CompleteMatchResponse> {
    const resultImageKeys = photos.length ? await uploadResultPhotos(photos) : undefined;
    return api.post<CompleteMatchResponse>(`/matches/${matchId}/complete`, { resultImageKeys });
  },
  /** 디자이너 → 손님 ('no' = 노쇼) */
  reviewCustomer: (matchId: string, promiseKept: PromiseKept) => api.post<CreateReviewResponse>(`/matches/${matchId}/reviews`, { promiseKept }),

  /** 내 포트폴리오. 인증 작업물은 손님이 완료를 확인하고 공개에 동의하면 쌓인다 */
  async portfolio(designerId: string): Promise<PortfolioItem[]> {
    return (await api.get<Paged<PortfolioItem>>(`/designers/${designerId}/portfolio${qs({ limit: LIMIT })}`)).items;
  },
};

/** 게시판 목록 한 줄의 조건 문구 (동작구 · 2주 안 · 5~10만) */
export const boardCondition = (b: Pick<BoardItem, 'regions' | 'timing' | 'budget'>) => conditionText(b.regions, b.timing, b.budget);
