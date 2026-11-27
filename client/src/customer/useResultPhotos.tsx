import { useState } from 'react';
import { hasFace } from '../account/faceMask';
import type { ResultPhoto } from '../account/upload';
import { normalizeSelfie } from '../flow/lib/image';
import { usePhotoPicker } from '../flow/ui/usePhotoPicker';
import { Button, Modal } from '../ui';

/**
 * 시술 결과 사진 (정면 · 옆·뒤, 최대 2장). 손님 완료 확인·디자이너 완료 요청에서 같이 쓴다.
 * 고를 때 얼굴을 찾아보고, 못 찾으면 '얼굴이 안 보이는 사진(옆·뒤)이 맞는지' 바로 묻는다.
 * 맞다고 하면 가리지 않고 올리고, 아니면 사진을 빼고 다시 고르게 한다. (얼굴이 보이면 업로드 때 가린 사본만 올린다)
 */
export function useResultPhotos(slots = 2) {
  const [photos, setPhotos] = useState<(ResultPhoto | undefined)[]>(() => Array.from({ length: slots }, () => undefined));
  const [slot, setSlot] = useState(0);
  const [checking, setChecking] = useState(false);
  const [pending, setPending] = useState<{ slot: number; image: string } | null>(null);

  const put = (i: number, p: ResultPhoto | undefined) => setPhotos((list) => list.map((x, k) => (k === i ? p : x)));

  const picker = usePhotoPicker(normalizeSelfie, async (image) => {
    const target = slot;
    setChecking(true);
    let face = true;
    try {
      face = await hasFace(image);
    } catch {
      // 검사기를 못 불러오면 여기서는 넘기고, 올릴 때 다시 검사한다 (그때 실패하면 올리지 않는다)
    } finally {
      setChecking(false);
    }
    if (face) put(target, { image, noFace: false });
    else setPending({ slot: target, image });
  });

  const modal = (
    <Modal
      open={Boolean(pending)}
      onClose={() => setPending(null)}
      title={'얼굴이 안 보이는\n사진인가요?'}
      body={'이 사진에서 얼굴을 찾지 못했어요.\n옆·뒷모습처럼 얼굴이 보이지 않는 사진이면 그대로 올려요.\n얼굴이 보이는 사진이면 다른 사진으로 골라 주세요.'}
      actions={
        <>
          <Button
            size="sm"
            onClick={() => {
              if (pending) put(pending.slot, { image: pending.image, noFace: true });
              setPending(null);
            }}
          >
            네, 얼굴이 안 보여요
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const s = pending?.slot ?? 0;
              setPending(null);
              setSlot(s);
              picker.open();
            }}
          >
            다른 사진 고르기
          </Button>
        </>
      }
    />
  );

  return {
    photos,
    /** 올릴 사진 (빈 칸 제외, 순서 유지) */
    selected: photos.filter((p): p is ResultPhoto => Boolean(p)),
    pick: (i: number) => {
      setSlot(i);
      picker.open();
    },
    reset: () => setPhotos(Array.from({ length: slots }, () => undefined)),
    /** 숨은 파일 입력 + 확인 팝업 (화면 어딘가에 넣는다) */
    elements: (
      <>
        {picker.input}
        {modal}
      </>
    ),
    error: picker.error,
    busy: checking || picker.busy,
  };
}
