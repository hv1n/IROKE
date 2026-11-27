// 업로드 직전 얼굴 가리기 (api-v2: request_design·result·portfolio는 얼굴을 가린 사본만 버킷에 올린다).
// 브라우저 안에서 MediaPipe Face Detector로 얼굴을 찾아 채운 타원으로 덮는다. 사진은 밖으로 나가지 않는다.
// 모델·wasm은 이 사이트에서 직접 내려준다 (처음 올릴 때만 받음, 약 14MB).
import type { FaceDetector } from '@mediapipe/tasks-vision';
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url';
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url';
import { loadImage, makeCanvas } from '../flow/lib/image';

const MODEL_URL = '/models/blaze_face_short_range.tflite';
/** 놓치는 얼굴이 없게 기준을 낮게 둔다 (가린 부분이 조금 넓어지는 쪽이 낫다) */
const MIN_CONFIDENCE = 0.3;
/** 올리는 사본의 긴 변 */
const MAX_EDGE = 1280;
/** 가림 색 (화면 회색 톤) */
const FILL = '#c9c9c9';

export class FaceNotFoundError extends Error {
  constructor() {
    super('사진에서 얼굴 위치를 찾지 못해 올리지 않았어요. 얼굴이 보이는 정면 사진으로 다시 골라 주세요.');
  }
}

let detector: Promise<FaceDetector> | null = null;

function getDetector(): Promise<FaceDetector> {
  detector ??= import('@mediapipe/tasks-vision')
    .then(({ FaceDetector }) =>
      FaceDetector.createFromOptions(
        { wasmLoaderPath, wasmBinaryPath },
        { baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' }, runningMode: 'IMAGE', minDetectionConfidence: MIN_CONFIDENCE },
      ),
    )
    .catch((err: unknown) => {
      detector = null;
      throw err;
    });
  return detector;
}

/**
 * 얼굴을 가린 JPEG 사본을 만든다. 얼굴을 하나도 못 찾으면 FaceNotFoundError (가리지 않은 사진은 올리지 않는다).
 * 원본은 건드리지 않는다.
 */
export async function maskFaces(dataUrl: string): Promise<Blob> {
  const img = await loadImage(dataUrl);
  const k = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const { canvas, ctx } = makeCanvas(Math.round(img.naturalWidth * k), Math.round(img.naturalHeight * k));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const { detections } = (await getDetector()).detect(canvas);
  const boxes = detections.flatMap((d) => (d.boundingBox ? [d.boundingBox] : []));
  if (!boxes.length) throw new FaceNotFoundError();

  ctx.fillStyle = FILL;
  for (const b of boxes) {
    // 검출 상자는 눈썹~입 언저리라 옆·아래(턱)로 넓힌다. 위는 조금만 (앞머리는 보여야 한다)
    const x0 = b.originX - b.width * 0.12;
    const x1 = b.originX + b.width * 1.12;
    const y0 = b.originY - b.height * 0.08;
    const y1 = b.originY + b.height * 1.2;
    ctx.beginPath();
    ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했어요.'))), 'image/jpeg', 0.9),
  );
}
