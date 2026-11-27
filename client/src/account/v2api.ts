// IROKE_backend(v2) 호출. 쿠키 없이 Bearer 토큰만 쓴다.
// 토큰은 AuthProvider가 bindAuth로 연결해 두고, 화면 쪽 API(customer/api·designer/api)는 api.get/post…만 부른다.
import type { HairProfileResponse, LoginResponse, Me, PutHairProfileRequest } from '@iroke/shared';

/** 개발 모드에서 비우면 로컬 백엔드(IROKE_backend를 PORT=8788로 띄운 것)를 쓴다 */
const DEV_DEFAULT_URL = 'http://localhost:8788/api';
export const API_V2_URL = ((import.meta.env.VITE_API_V2_URL as string | undefined) || (import.meta.env.DEV ? DEV_DEFAULT_URL : '')).replace(/\/$/, '');
export const KAKAO_REST_API_KEY = (import.meta.env.VITE_KAKAO_REST_API_KEY as string | undefined) ?? '';

export class V2Error extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** validation_failed일 때 항목별 안내 (개발자용 문구) */
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

/** 백엔드 문구(error)는 개발자용이라 화면에는 코드별 안내를 쓴다 */
const MESSAGES: Record<string, string> = {
  unauthorized: '로그인이 만료됐어요. 다시 로그인해 주세요.',
  forbidden: '이 작업을 할 수 있는 권한이 없어요.',
  not_verified: '면허 인증이 끝나면 할 수 있어요.',
  not_found: '찾을 수 없어요. 이미 지워졌거나 볼 수 없는 항목이에요.',
  already_responded: '이미 남겼어요. 같은 건에는 한 번만 할 수 있어요.',
  invalid_state: '지금 상태에서는 할 수 없어요. 화면을 새로 고쳐 주세요.',
  request_closed: '이미 마감된 요청이에요.',
  consent_required: '시안 공개에 동의해 주세요.',
  payload_too_large: '사진이 너무 커요. 5MB 이하로 올려 주세요.',
};
/** validation_failed의 항목 → 안내 (자주 나는 것만) */
const FIELD_MESSAGES: Record<string, string> = {
  bookingUrl: '예약링크를 확인해 주세요. https:// 로 시작해야 해요. 프로필에 예약링크가 없으면 응답할 수 없어요.',
  regions: '지역을 1~2곳 골라 주세요.',
  comment: '코멘트를 확인해 주세요.',
  condition: '조건을 적어 주세요.',
  priceMin: '가격대를 다시 확인해 주세요.',
  priceMax: '가격대를 다시 확인해 주세요.',
  text: '후기는 100자까지 쓸 수 있어요.',
  licenseImageKey: '면허증 사진을 다시 올려 주세요.',
  designImageKey: '시안 사진을 다시 올려 주세요.',
};

function friendly(status: number, code: string | undefined, fields?: Record<string, string>): string {
  if (code === 'validation_failed') {
    const hit = Object.keys(fields ?? {}).map((f) => FIELD_MESSAGES[f.split('.')[0]!]).find(Boolean);
    return hit ?? '입력한 내용을 다시 확인해 주세요.';
  }
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (status >= 500) return '서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
  return '요청을 처리하지 못했어요.';
}

// ── 토큰 연결 ──

let tokenSource: () => string | null = () => null;
let onUnauthorized: () => void = () => undefined;

/** AuthProvider가 호출: 지금 토큰을 꺼내는 함수와 401 때 로그아웃할 함수 */
export function bindAuth(getToken: () => string | null, unauthorized: () => void) {
  tokenSource = getToken;
  onUnauthorized = unauthorized;
}

interface CallInit {
  method?: string;
  body?: unknown;
  /** 지정하면 이 토큰을 쓴다 (로그인 직후 등). null이면 토큰 없이 */
  token?: string | null;
}

async function call<T>(path: string, init: CallInit = {}): Promise<T> {
  if (!API_V2_URL) throw new V2Error(0, 'not_configured', '지금은 이 기능을 쓸 수 없어요.');
  const token = init.token === undefined ? tokenSource() : init.token;
  let res: Response;
  try {
    res = await fetch(`${API_V2_URL}${path}`, {
      method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
      headers: {
        ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new V2Error(0, 'network', '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as { code?: string; error?: string; fields?: Record<string, string> } | null;
  if (!res.ok) {
    // 저장된 토큰이 만료·무효 → 로그아웃 (로그인 시도 자체의 401은 제외)
    if (res.status === 401 && token && init.token === undefined) onUnauthorized();
    if (import.meta.env.DEV) console.warn(`[api] ${init.method ?? 'GET'} ${path} → ${res.status}`, data);
    throw new V2Error(res.status, data?.code ?? 'server_error', friendly(res.status, data?.code, data?.fields), data?.fields);
  }
  return data as T;
}

/** 쿼리 문자열 (빈 값은 뺀다) */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const api = {
  get: <T,>(path: string) => call<T>(path),
  post: <T,>(path: string, body: unknown = {}) => call<T>(path, { method: 'POST', body }),
  put: <T,>(path: string, body: unknown) => call<T>(path, { method: 'PUT', body }),
  patch: <T,>(path: string, body: unknown) => call<T>(path, { method: 'PATCH', body }),
};

/** 로그인·계정 (AuthProvider 전용: 토큰을 직접 넘긴다) */
export const v2 = {
  kakaoLogin: (code: string, redirectUri: string) => call<LoginResponse>('/auth/kakao', { body: { code, redirectUri }, token: null }),
  devLogin: (kakaoId: string) => call<LoginResponse>('/auth/dev', { body: { kakaoId }, token: null }),
  logout: (token: string) => call<void>('/auth/logout', { method: 'POST', token }),
  me: (token: string) => call<Me>('/me', { token }),
  getHairProfile: (token: string) => call<HairProfileResponse>('/me/hair-profile', { token }),
  putHairProfile: (token: string, body: PutHairProfileRequest) => call<HairProfileResponse>('/me/hair-profile', { method: 'PUT', body, token }),
};
