import { useRef, useState } from 'react';

/** 숨은 파일 입력으로 사진을 고르고 서비스 규격으로 바꾼다 */
export function usePhotoPicker(process: (file: File) => Promise<string>, onDone: (dataUrl: string) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onDone(await process(file));
    } catch {
      setError('이 사진은 열 수 없어요. JPG나 PNG 사진으로 다시 올려 주세요.');
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  const input = <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => handle(e.target.files?.[0])} />;
  return { open: () => ref.current?.click(), input, busy, error };
}
