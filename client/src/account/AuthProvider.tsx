import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { LoginResponse, Me, PutHairProfileRequest } from '@iroke/shared';
import { clearSavedProfile, loadSavedProfile, saveProfile } from '../flow/lib/storage';
import { API_V2_URL, KAKAO_REST_API_KEY, V2Error, bindAuth, v2 } from './v2api';

/**
 * 로그인 방식
 * - kakao: 카카오 인가 → 백엔드 /auth/kakao
 * - dev: 카카오 키 없이 백엔드 /auth/dev (개발 모드 + 백엔드 memory 모드의 시드 계정)
 * - off: 배포인데 설정이 빠짐 → 로그인 버튼이 안내만 보여 준다
 */
export type AuthMode = 'kakao' | 'dev' | 'off';
export const AUTH_MODE: AuthMode = API_V2_URL && KAKAO_REST_API_KEY ? 'kakao' : import.meta.env.DEV && API_V2_URL ? 'dev' : 'off';

/**
 * 개발용 로그인 계정 (백엔드 시드). 디자이너 화면(/pro…)에서 로그인하면 인증 디자이너,
 * 그 밖에서는 손님. 서로 다른 계정이라 손님이 올린 요청에 디자이너로 응답해 볼 수 있다.
 */
export const DEV_ACCOUNTS = { customer: 'seed-customer-1', designer: 'seed-designer-1' } as const;
const devAccountFor = (returnTo: string) => (returnTo.startsWith('/pro') ? DEV_ACCOUNTS.designer : DEV_ACCOUNTS.customer);

const KEY = 'iroke.auth';
const STATE_KEY = 'iroke.kakao.state';
export const KAKAO_CALLBACK_PATH = '/auth/kakao/callback';

interface Stored {
  accessToken: string;
  /** ms */
  expiresAt: number;
  user: Me;
}

function load(): Stored | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Stored | null;
    // 이전 목업 로그인(accessToken 'mock')은 버린다
    return s && s.expiresAt > Date.now() && s.accessToken !== 'mock' ? s : null;
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

/**
 * 로그인 직후·앱을 열 때 모발 프로필 맞추기
 * - 이 브라우저 것이 다른 계정 것이면 버린다 (같은 기기에서 계정을 바꾼 경우)
 * - 이 브라우저 것이 더 최근이면(로그인 전에 확정) → 서버로 올린다
 * - 서버 것이 더 최근이면(시술 완료 확인으로 바뀐 경우 등) → 이 브라우저로 받는다
 */
async function syncHairProfile(token: string, user: Me) {
  let local = loadSavedProfile();
  if (local?.ownerId && local.ownerId !== user.id) {
    clearSavedProfile();
    local = null;
  }
  const server = user.hasHairProfile ? await v2.getHairProfile(token) : null;
  if (local && (!server || Date.parse(local.confirmedAt) > Date.parse(server.updatedAt))) {
    if (local.ownerId !== user.id || !server) {
      await v2.putHairProfile(token, { profile: local.profile, profileSource: { editedFields: [], confirmedAt: local.confirmedAt } });
    }
    saveProfile({ ...local, ownerId: user.id });
  } else if (server) {
    saveProfile({ profile: server.profile, confirmedAt: server.updatedAt, ownerId: user.id });
  }
}

interface AuthValue {
  mode: AuthMode;
  user: Me | null;
  token: string | null;
  /** 카카오 로그인 시작. 끝나면 returnTo로 돌아온다 */
  login: (returnTo: string) => Promise<void>;
  /** 콜백 화면에서 호출. 돌아갈 경로를 돌려준다 */
  completeKakao: (code: string, state: string | null) => Promise<string>;
  logout: () => void;
  /** 내 정보(디자이너 등록 상태 등)를 서버에서 다시 읽는다 */
  refreshUser: () => Promise<Me | null>;
  /** 로그인한 경우에만 서버 모발 프로필에도 저장 (실패해도 흐름은 막지 않는다) */
  saveHairProfile: (body: PutHairProfileRequest) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Stored | null>(load);
  const ref = useRef(stored);
  ref.current = stored;

  const update = useCallback((s: Stored | null) => {
    persist(s);
    ref.current = s;
    setStored(s);
  }, []);

  const clear = useCallback(() => update(null), [update]);

  // 화면 쪽 API가 토큰을 꺼내 쓰고, 401이면 로그아웃되게 연결
  bindAuth(() => {
    const s = ref.current;
    return s && s.expiresAt > Date.now() ? s.accessToken : null;
  }, clear);

  const accept = useCallback(
    (res: LoginResponse) => {
      update({ accessToken: res.accessToken, expiresAt: Date.now() + res.expiresIn * 1000, user: res.user });
      syncHairProfile(res.accessToken, res.user).catch(() => undefined);
    },
    [update],
  );

  const refreshUser = useCallback(async () => {
    const s = ref.current;
    if (!s) return null;
    try {
      const user = await v2.me(s.accessToken);
      if (ref.current?.accessToken === s.accessToken) update({ ...s, user });
      return user;
    } catch (err) {
      if (err instanceof V2Error && err.status === 401) clear();
      throw err;
    }
  }, [update, clear]);

  // 저장된 토큰이 아직 유효한지, 내 정보가 바뀌었는지 확인 (만료·서명 오류면 로그아웃)
  useEffect(() => {
    if (!stored || AUTH_MODE === 'off') return;
    refreshUser()
      .then((user) => user && syncHairProfile(stored.accessToken, user))
      .catch(() => undefined);
    // 앱을 열 때 한 번만
  }, []);

  const login = useCallback(
    async (returnTo: string) => {
      if (AUTH_MODE === 'off') throw new V2Error(0, 'not_configured', '지금은 로그인을 쓸 수 없어요.');
      if (AUTH_MODE === 'dev') {
        accept(await v2.devLogin(devAccountFor(returnTo)));
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
    if (stored) v2.logout(stored.accessToken).catch(() => undefined);
    // 계정 서버에 올라간 모발 프로필은 이 기기에서 지운다 (다음 사람이 쓰지 않게. 다시 로그인하면 받아 온다)
    if (loadSavedProfile()?.ownerId) clearSavedProfile();
    clear();
  }, [stored, clear]);

  const saveHairProfile = useCallback(
    (body: PutHairProfileRequest) => {
      if (!stored || AUTH_MODE === 'off') return;
      v2.putHairProfile(stored.accessToken, body)
        .then(() => {
          const local = loadSavedProfile();
          if (local) saveProfile({ ...local, ownerId: stored.user.id });
        })
        .catch(() => undefined);
    },
    [stored],
  );

  const value = useMemo<AuthValue>(
    () => ({ mode: AUTH_MODE, user: stored?.user ?? null, token: stored?.accessToken ?? null, login, completeKakao, logout, refreshUser, saveHairProfile }),
    [stored, login, completeKakao, logout, refreshUser, saveHairProfile],
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
