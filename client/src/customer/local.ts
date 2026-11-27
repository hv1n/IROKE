// 이 브라우저에만 두는 손님 쪽 값
// - originals: 요청 id → 얼굴을 가리지 않은 시안 썸네일 (본인 화면은 원본으로 보여 준다. 서버에는 가린 사본만)
// - seen: 응답 목록에서 이미 본 응답 id ('확인하지 않은 응답 N개' 표시용)
const ORIGINALS_KEY = 'iroke.requestOriginals';
const SEEN_KEY = 'iroke.seenResponses';
const MAX_ORIGINALS = 12;
const MAX_SEEN = 300;

function read<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(localStorage.getItem(key) ?? 'null') as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 공간이 부족하면 원본 대신 서버 사본(얼굴 가림)을 보여 준다
  }
}

export function saveOriginal(requestId: string, thumb: string) {
  const list = read<[string, string][]>(ORIGINALS_KEY, []).filter(([id]) => id !== requestId);
  write(ORIGINALS_KEY, [[requestId, thumb], ...list].slice(0, MAX_ORIGINALS));
}

/** 이 브라우저에서 올린 요청이면 원본 썸네일, 아니면 서버 사본 URL */
export function originalOr(requestId: string, serverUrl: string | null | undefined): string | null {
  return read<[string, string][]>(ORIGINALS_KEY, []).find(([id]) => id === requestId)?.[1] ?? serverUrl ?? null;
}

export function unseenCount(responseIds: string[]): number {
  const seen = new Set(read<string[]>(SEEN_KEY, []));
  return responseIds.filter((id) => !seen.has(id)).length;
}

export function markSeen(responseIds: string[]) {
  const seen = read<string[]>(SEEN_KEY, []);
  write(SEEN_KEY, [...new Set([...responseIds, ...seen])].slice(0, MAX_SEEN));
}
