import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { LoginResponse, Me, PutHairProfileRequest } from '@iroke/shared';
import { API_V2_URL, KAKAO_REST_API_KEY, V2Error, v2 } from './v2api';

/**
 * 로그인 방식
 * - kakao: 카카오 인가 → 백엔드 /auth/kakao
 * - dev: 카카오 키 없이 백엔드 /auth/dev (시드 손님 계정, 개발 모드만)
 * - mock: 백엔드 주소도 없을 때 (개발 모드만) 브라우저 안 가짜 계정
 * - off: 배포인데 설정이 빠짐 → 로그인 버튼이 안내만 보여 준다
 */
export type AuthMode = 'kakao' | 'dev' | 'mock' | 'off';
export const AUTH_MODE: AuthMode =
  API_V2_URL && KAKAO_REST_API_KEY ? 'kakao' : import.meta.env.DEV ? (API_V2_URL ? 'dev' : 'mock') : 'off';

const KEY = 'iroke.auth';
const STATE_KEY = 'iroke.kakao.state';
export const KAKAO_CALLBACK_PATH = '/auth/kakao/callback';

interface Stored {
  accessToken: string;
  /** ms */
  expiresAt: number;
  user: Me;
}

const MOCK_USER: Me = { id: 'mock-user', nickname: '테스트 손님', temperature: 36.5, hasHairProfile: false, designer: null };

function load(): Stored | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Stored | null;
    return s && s.expiresAt > Date.now() ? s : null;
  } catch {
    return null;
  }
}

function persist(s: Stored | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    // 저장 공간을 못 쓰면 이 탭에서만 로그인 유지
  }
}

const redirectUri = () => `${location.origin}${KAKAO_CALLBACK_PATH}`;

interface AuthValue {
  mode: AuthMode;
  user: Me | null;
  token: string | null;
  /** 카카오 로그인 시작. 끝나면 returnTo로 돌아온다 */
  login: (returnTo: string) => Promise<void>;
  /** 콜백 화면에서 호출. 돌아갈 경로를 돌려준다 */
  completeKakao: (code: string, state: string | null) => Promise<string>;
  logout: () => void;
  /** 로그인한 경우에만 서버 모발 프로필에도 저장 (실패해도 흐름은 막지 않는다) */
  saveHairProfile: (body: PutHairProfileRequest) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Stored | null>(load);

  const accept = useCallback((res: LoginResponse) => {
    const s = { accessToken: res.accessToken, expiresAt: Date.now() + res.expiresIn * 1000, user: res.user };
    persist(s);
    setStored(s);
  }, []);

  const clear = useCallback(() => {
    persist(null);
    setStored(null);
  }, []);

  // 저장된 토큰이 아직 유효한지, 내 정보가 바뀌었는지 확인 (만료·서명 오류면 로그아웃)
  useEffect(() => {
    if (!stored || AUTH_MODE === 'mock' || AUTH_MODE === 'off') return;
    let alive = true;
    v2.me(stored.accessToken)
      .then((user) => {
        if (!alive) return;
        const next = { ...stored, user };
        persist(next);
        setStored(next);
      })
      .catch((err) => alive && err instanceof V2Error && err.status === 401 && clear());
    return () => {
      alive = false;
    };
    // 앱을 열 때 한 번만
  }, []);

  const login = useCallback(
    async (returnTo: string) => {
      if (AUTH_MODE === 'off') throw new V2Error(0, 'not_configured', '지금은 로그인을 쓸 수 없어요.');
      if (AUTH_MODE === 'mock') {
        accept({ accessToken: 'mock', expiresIn: 7 * 24 * 3600, isNewUser: false, user: MOCK_USER });
        return;
      }
      if (AUTH_MODE === 'dev') {
        accept(await v2.devLogin('seed-customer-1'));
        return;
      }
      const state = crypto.randomUUID();
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ state, returnTo }));
      const q = new URLSearchParams({ client_id: KAKAO_REST_API_KEY, redirect_uri: redirectUri(), response_type: 'code', state });
      location.assign(`https://kauth.kakao.com/oauth/authorize?${q}`);
    },
    [accept],
  );

  const completeKakao = useCallback(
    async (code: string, state: string | null) => {
      const saved = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? 'null') as { state: string; returnTo: string } | null;
      sessionStorage.removeItem(STATE_KEY);
      if (!saved || saved.state !== state) throw new V2Error(400, 'bad_state', '로그인 요청이 만료됐어요. 다시 시도해 주세요.');
      accept(await v2.kakaoLogin(code, redirectUri()));
      return saved.returnTo;
    },
    [accept],
  );

  const logout = useCallback(() => {
    if (stored && AUTH_MODE !== 'mock') v2.logout(stored.accessToken).catch(() => undefined);
    clear();
  }, [stored, clear]);

  const saveHairProfile = useCallback(
    (body: PutHairProfileRequest) => {
      if (!stored || AUTH_MODE === 'mock' || AUTH_MODE === 'off') return;
      v2.putHairProfile(stored.accessToken, body).catch(() => undefined);
    },
    [stored],
  );

  const value = useMemo<AuthValue>(
    () => ({ mode: AUTH_MODE, user: stored?.user ?? null, token: stored?.accessToken ?? null, login, completeKakao, logout, saveHairProfile }),
    [stored, login, completeKakao, logout, saveHairProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있음');
  return ctx;
}

/** 카카오 콜백에서 돌아갈 경로를 모를 때 (상태값 유실) 쓰는 기본값 */
export const DEFAULT_RETURN = '/';
