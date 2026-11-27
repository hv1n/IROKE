import { useCallback, useState } from 'react';
import { designerApi, type MyDesigner } from './mockApi';

/** 내 디자이너 정보 (목업 저장소). refresh로 다시 읽는다 */
export function useDesigner(): [MyDesigner | null, () => void] {
  const [me, setMe] = useState(() => designerApi.me());
  const refresh = useCallback(() => setMe(designerApi.me()), []);
  return [me, refresh];
}
