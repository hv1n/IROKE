// 미용사 전달 카드 저장 이미지 (Canvas). 6/6 카드 화면(Figma 459:668)과 같은 모양을 3배 크기로 그린다.
// 어두운 배경 위에 [시안 사진 + 스타일명·모발 정보] 카드, 그 아래 [요청사항] 반투명 패널. 원본 셀카는 넣지 않는다.
import type { HairProfile } from '@iroke/shared';
import { loadImage, makeCanvas } from './image';
import { historyKinds, profileSummary } from './labels';

export interface CardInput {
  /** AI 시안 */
  after: string;
  styleTag: string;
  profile: HairProfile;
  note: string;
  date: Date;
}

/** 화면 px → 이미지 px */
const S = 3;
const W = 1080;
const CARD_W = 321 * S;
const X = Math.round((W - CARD_W) / 2);
const TOP = 150;
const BOTTOM = 72;

const BG = '#535353';
const TEXT = '#f5f5f5';
const SUBTLE = 'rgba(245, 245, 245, 0.62)';
const FONT = '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif';
const FOOTER = 'AI 시안은 참고용이에요. 실제 결과는 모발 상태와 시술 방법에 따라 달라질 수 있어요.';

// 카드 치수 (flow.css .hair-card와 같은 값 × S)
const PHOTO_H = 444 * S;
const PHOTO_R = 39 * S;
const INFO_PAD = { top: 50 * S, side: 31 * S, bottom: 30 * S };
const STYLE = { size: 22 * S, line: 33 * S, gap: 12 * S };
const GRID = { cols: 3, colGap: 12 * S, rowGap: 19 * S, label: 11 * S, labelLine: 15 * S, value: 12 * S, valueLine: 16 * S };
const NOTE = { overlap: 40 * S, padTop: 61 * S, padSide: 22 * S, padBottom: 26 * S, r: 41 * S, title: 17 * S, titleLine: 26 * S, gap: 6 * S, text: 13 * S, textLine: 20 * S };

const font = (weight: number, size: number) => `${weight} ${size}px ${FONT}`;
const formatDate = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

/** 한글은 단어가 길어도 글자 단위로 줄바꿈할 수 있어야 한다 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/(\s+)/)) {
      if (ctx.measureText(line + word).width <= maxWidth) {
        line += word;
        continue;
      }
      if (line.trim()) lines.push(line.trimEnd());
      line = '';
      for (const ch of word.trimStart()) {
        if (ctx.measureText(line + ch).width > maxWidth && line) {
          lines.push(line);
          line = '';
        }
        line += ch;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

/** 칸보다 길면 글자를 줄여 한 줄에 맞춘다 */
function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number) {
  let s = size;
  ctx.font = font(weight, s);
  while (s > size * 0.7 && ctx.measureText(text).width > maxWidth) ctx.font = font(weight, --s);
}

function coverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

export async function renderCard(input: CardInput): Promise<HTMLCanvasElement> {
  await Promise.all([document.fonts.load(font(700, 40), '가'), document.fonts.load(font(400, 30), '가'), document.fonts.load(font(600, 40), '가')]).catch(() => undefined);
  const after = await loadImage(input.after);
  const cells: [string, string][] = [...profileSummary(input.profile), ['시술 이력', historyKinds(input.profile)]];

  // 1) 높이를 정하기 위해 글줄을 먼저 잰다
  const { ctx: measure } = makeCanvas(1, 1);
  measure.font = font(600, STYLE.size);
  const styleLines = wrap(measure, input.styleTag, CARD_W - INFO_PAD.side * 2);
  measure.font = font(400, NOTE.text);
  const noteLines = wrap(measure, input.note.trim() || '-', CARD_W - NOTE.padSide * 2);
  measure.font = font(400, 30);
  const footerLines = wrap(measure, FOOTER, CARD_W);

  const rows = Math.ceil(cells.length / GRID.cols);
  const rowH = GRID.labelLine + GRID.valueLine;
  const infoH = INFO_PAD.top + styleLines.length * STYLE.line + STYLE.gap + rows * rowH + (rows - 1) * GRID.rowGap + INFO_PAD.bottom;
  const photoTop = TOP;
  const noteTop = photoTop + PHOTO_H - NOTE.overlap;
  const noteH = NOTE.padTop + NOTE.titleLine + NOTE.gap + noteLines.length * NOTE.textLine + NOTE.padBottom;
  const footerTop = noteTop + noteH + 60;
  const H = footerTop + footerLines.length * 44 + BOTTOM;

  // 2) 그린다
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  // 머리글: IROKE · 날짜
  ctx.fillStyle = TEXT;
  ctx.font = font(700, 42);
  ctx.fillText('IROKE', X, 96);
  ctx.font = font(500, 30);
  ctx.fillStyle = SUBTLE;
  ctx.textAlign = 'right';
  ctx.fillText(formatDate(input.date), X + CARD_W, 96);
  ctx.textAlign = 'left';

  // 요청사항 패널 (사진 카드 뒤로 겹친다)
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
  ctx.shadowBlur = 34 * S;
  ctx.shadowOffsetX = 6 * S;
  ctx.shadowOffsetY = 8 * S;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.26)';
  ctx.beginPath();
  ctx.roundRect(X, noteTop, CARD_W, noteH, NOTE.r);
  ctx.fill();
  ctx.restore();

  let y = noteTop + NOTE.padTop;
  ctx.fillStyle = TEXT;
  ctx.font = font(700, NOTE.title);
  ctx.fillText('요청사항', X + NOTE.padSide, y + NOTE.titleLine * 0.78);
  y += NOTE.titleLine + NOTE.gap;
  ctx.font = font(400, NOTE.text);
  noteLines.forEach((line, i) => ctx.fillText(line, X + NOTE.padSide, y + NOTE.textLine * 0.78 + i * NOTE.textLine));

  // 사진 카드
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
  ctx.shadowBlur = 32 * S;
  ctx.shadowOffsetX = 6 * S;
  ctx.shadowOffsetY = 8 * S;
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath();
  ctx.roundRect(X, photoTop, CARD_W, PHOTO_H, PHOTO_R);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(X, photoTop, CARD_W, PHOTO_H, PHOTO_R);
  ctx.clip();
  coverImage(ctx, after, X, photoTop, CARD_W, PHOTO_H);
  // 아래쪽 정보 영역 그라데이션 (투명 → #212121 72%)
  const infoTop = photoTop + PHOTO_H - infoH;
  const grad = ctx.createLinearGradient(0, infoTop, 0, photoTop + PHOTO_H);
  grad.addColorStop(0, 'rgba(47, 47, 47, 0)');
  grad.addColorStop(0.72, '#212121');
  grad.addColorStop(1, '#212121');
  ctx.fillStyle = grad;
  ctx.fillRect(X, infoTop, CARD_W, infoH);

  const left = X + INFO_PAD.side;
  y = infoTop + INFO_PAD.top;
  ctx.fillStyle = TEXT;
  ctx.font = font(600, STYLE.size);
  styleLines.forEach((line, i) => ctx.fillText(line, left, y + STYLE.line * 0.75 + i * STYLE.line));
  y += styleLines.length * STYLE.line + STYLE.gap;

  const colW = (CARD_W - INFO_PAD.side * 2 - GRID.colGap * (GRID.cols - 1)) / GRID.cols;
  cells.forEach(([label, value], i) => {
    const cx = left + (i % GRID.cols) * (colW + GRID.colGap);
    const cy = y + Math.floor(i / GRID.cols) * (rowH + GRID.rowGap);
    ctx.fillStyle = TEXT;
    fitText(ctx, label, 400, GRID.label, colW);
    ctx.fillText(label, cx, cy + GRID.labelLine * 0.8);
    fitText(ctx, value, 700, GRID.value, colW);
    ctx.fillText(value, cx, cy + GRID.labelLine + GRID.valueLine * 0.8);
  });
  ctx.restore();

  // 안내 문구
  ctx.font = font(400, 30);
  ctx.fillStyle = SUBTLE;
  footerLines.forEach((line, i) => ctx.fillText(line, X, footerTop + 30 + i * 44));

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG 변환 실패'))), 'image/png'));
}
