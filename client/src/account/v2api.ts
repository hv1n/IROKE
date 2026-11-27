// IROKE_backend(v2) 호출. 쿠키 없이 Bearer 토큰만 쓴다.
import type { HairProfileResponse, LoginResponse, Me, PutHairProfileRequest } from '@iroke/shared';

export const API_V2_URL = (import.meta.env.VITE_API_V2_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const KAKAO_REST_API_KEY = (import.meta.env.VITE_KAKAO_REST_API_KEY as string | undefined) ?? '';

export class V2Error extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function friendly(status: number): string {
  if (status === 401) return '로그인에 실패했어요. 다시 시도해 주세요.';
  if (status >= 500) return '서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
  return '요청을 처리하지 못했어요.';
}

async function call<T>(path: string, init: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_V2_URL}${path}`, {
      method: init.method ?? (init.body ? 'POST' : 'GET'),
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new V2Error(0, 'network', '서버에 연결하지 못했어요.');
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
  // 백엔드 문구(error)는 개발자용이라 화면에는 상태별 안내를 쓴다
  if (!res.ok) throw new V2Error(res.status, data?.code ?? 'server_error', friendly(res.status));
  return data as T;
}

export const v2 = {
  kakaoLogin: (code: string, redirectUri: string) => call<LoginResponse>('/auth/kakao', { body: { code, redirectUri } }),
  devLogin: (kakaoId: string) => call<LoginResponse>('/auth/dev', { body: { kakaoId } }),
  logout: (token: string) => call<void>('/auth/logout', { method: 'POST', token }),
  me: (token: string) => call<Me>('/me', { token }),
  putHairProfile: (token: string, body: PutHairProfileRequest) => call<HairProfileResponse>('/me/hair-profile', { method: 'PUT', body, token }),
};
