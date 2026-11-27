// 사진 올리기: POST /uploads로 서명 URL을 받아 바이트를 직접 PUT → key만 API에 넘긴다.
// request_design·result·portfolio는 얼굴을 가린 사본만 올린다 (원본은 브라우저에만 남는다).
import { MARKETPLACE_LIMITS, type UploadContentType, type UploadPurpose, type UploadResponse } from '@iroke/shared';
import { maskFaces } from './faceMask';
import { V2Error, api } from './v2api';

const MASKED: UploadPurpose[] = ['request_design', 'result', 'portfolio'];

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

/** 사진 한 장을 올리고 key를 돌려준다 */
export async function uploadImage(purpose: UploadPurpose, dataUrl: string): Promise<string> {
  const blob = MASKED.includes(purpose) ? await maskFaces(dataUrl) : await dataUrlToBlob(dataUrl);
  const contentType = (['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) ? blob.type : 'image/jpeg') as UploadContentType;
  if (blob.size > MARKETPLACE_LIMITS.uploadMaxBytes) throw new V2Error(413, 'payload_too_large', '사진이 너무 커요. 5MB 이하로 올려 주세요.');

  const { key, uploadUrl } = await api.post<UploadResponse>('/uploads', { purpose, contentType, size: blob.size });
  let res: Response;
  try {
    res = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': contentType }, body: blob });
  } catch {
    throw new V2Error(0, 'network', '사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  if (!res.ok) throw new V2Error(res.status, 'upload_failed', '사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.');
  return key;
}

/** 여러 장 (순서 유지) */
export function uploadImages(purpose: UploadPurpose, dataUrls: string[]): Promise<string[]> {
  return Promise.all(dataUrls.map((d) => uploadImage(purpose, d)));
}
