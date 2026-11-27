// 손님 [디자이너 구하기] API (IROKE_backend api-v2).
import type {
  AcceptResponseResult,
  CloseRequestResponse,
  ConfirmMatchResponse,
  CreateRequestBody,
  CreateRequestResponse,
  CreateReviewResponse,
  CustomerReviewBody,
  DesignerPublicProfile,
  DesignerReview,
  DisputeMatchBody,
  MatchDetail,
  MyRequestFilter,
  MyRequestItem,
  Paged,
  PortfolioItem,
  PortfolioSource,
  ReopenRequestResponse,
  RequestDetail,
  ResponseCard,
  ResponseSort,
  UpdateRequestBody,
} from '@iroke/shared';
import { uploadImage, uploadImages } from '../account/upload';
import { api, qs } from '../account/v2api';
import { loadSavedProfile, saveProfile } from '../flow/lib/storage';
import { thumbnail } from './cards';
import { saveOriginal } from './local';

/** 목록은 한 번에 최대 50개 (그 이상은 아직 화면에 없다) */
const LIMIT = 50;

export const customerApi = {
  /**
   * 시안(얼굴 가린 사본)을 올리고 요청을 등록한다.
   * 이 브라우저에는 원본 썸네일을 남겨 본인 화면에서 원본으로 보여 준다.
   */
  async createRequest(body: Omit<CreateRequestBody, 'designImageKey'>, designImage: string): Promise<CreateRequestResponse> {
    const designImageKey = await uploadImage('request_design', designImage);
    const res = await api.post<CreateRequestResponse>('/requests', { ...body, designImageKey });
    saveOriginal(res.id, await thumbnail(designImage));
    return res;
  },

  listMyRequests: (filter?: MyRequestFilter) => api.get<Paged<MyRequestItem>>(`/requests/mine${qs({ status: filter, limit: LIMIT })}`),
  getRequest: (id: string) => api.get<RequestDetail>(`/requests/${id}`),
  updateRequest: (id: string, body: UpdateRequestBody) => api.patch<RequestDetail>(`/requests/${id}`, body),
  closeRequest: (id: string) => api.post<CloseRequestResponse>(`/requests/${id}/close`),
  /** 마감(expired)되고 응답이 0개인 요청만 다시 올릴 수 있다 */
  reopenRequest: (id: string, body: UpdateRequestBody = {}) => api.post<ReopenRequestResponse>(`/requests/${id}/reopen`, body),

  // ── 응답 비교 · 수락 ──

  listResponses: (requestId: string, sort: ResponseSort = 'price_asc') =>
    api.get<Paged<ResponseCard>>(`/requests/${requestId}/responses${qs({ sort, limit: LIMIT })}`),
  /** 예약 링크는 여기서만 내려온다 */
  acceptResponse: (responseId: string) => api.post<AcceptResponseResult>(`/responses/${responseId}/accept`),

  // ── 디자이너 프로필 ──

  getDesigner: (id: string) => api.get<DesignerPublicProfile>(`/designers/${id}`),
  getPortfolio: (id: string, source?: PortfolioSource) => api.get<Paged<PortfolioItem>>(`/designers/${id}/portfolio${qs({ source, limit: LIMIT })}`),
  getReviews: (id: string) => api.get<Paged<DesignerReview>>(`/designers/${id}/reviews${qs({ limit: LIMIT })}`),

  // ── 매칭 · 완료 · 후기 ──

  getMatch: (id: string) => api.get<MatchDetail>(`/matches/${id}`),

  /** 완료 확인. 결과 사진(최대 2장)은 얼굴을 가린 사본으로 올린다. 바뀐 모발 프로필은 이 브라우저에도 반영 */
  async confirmMatch(id: string, photos: string[], portfolioConsent: boolean): Promise<ConfirmMatchResponse> {
    const resultImageKeys = photos.length ? await uploadImages('result', photos) : undefined;
    const res = await api.post<ConfirmMatchResponse>(`/matches/${id}/confirm`, { resultImageKeys, portfolioConsent });
    const local = loadSavedProfile();
    if (local) saveProfile({ ...local, profile: res.hairProfile, confirmedAt: new Date().toISOString() });
    return res;
  },

  disputeMatch: (id: string, body: DisputeMatchBody) => api.post<void>(`/matches/${id}/dispute`, body),
  reviewMatch: (id: string, body: CustomerReviewBody) => api.post<CreateReviewResponse>(`/matches/${id}/reviews`, body),
};
