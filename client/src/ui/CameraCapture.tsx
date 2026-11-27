import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { BackButton } from './StepHeader';
import { Button } from './Button';

type Phase = 'starting' | 'live' | 'shot' | 'unavailable';

interface CameraCaptureProps {
  /** user: 셀카(거울처럼 보임) · environment: 면허증 */
  facing: 'user' | 'environment';
  /** 촬영 틀 크기 (px) */
  frame: { width: number; height: number };
  guide: ReactNode;
  tips: ReactNode;
  /** 사진(파일·촬영)을 서비스 규격으로 바꾼다 */
  process: (file: Blob) => Promise<string>;
  onDone: (image: string) => void;
  onBack: () => void;
}

/**
 * 어두운 촬영 화면 (Figma 459:1008 셀카 · 547:4958 면허증).
 * 디자인의 "자동으로 촬영돼요"는 검출 모델이 필요해 셔터를 눌러 찍는다. 카메라를 못 쓰면 파일업로드만 남긴다.
 */
export function CameraCapture({ facing, frame, guide, tips, process, onDone, onBack }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('starting');
  const [shot, setShot] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase('unavailable');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1600 }, height: { ideal: 1600 } }, audio: false })
      .then((stream) => {
        if (!alive) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setPhase('live');
      })
      .catch(() => alive && setPhase('unavailable'));
    return () => {
      alive = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  const finish = async (blob: Blob) => {
    setBusy(true);
    setError('');
    try {
      onDone(await process(blob));
    } catch {
      setError('이 사진은 열 수 없어요. JPG나 PNG 사진으로 다시 올려 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    setShot(c.toDataURL('image/jpeg', 0.92));
    setPhase('shot');
  };

  return (
    <div className="camera">
      <div className="camera__top">
        <BackButton light onClick={onBack} />
      </div>
      <p className="camera__guide">{phase === 'unavailable' ? '카메라를 쓸 수 없어요.\n파일업로드로 올려 주세요.' : guide}</p>
      <div className="camera__frame" style={{ width: frame.width, height: frame.height }}>
        <video
          ref={videoRef}
          className={`camera__video${facing === 'user' ? ' is-mirror' : ''}`}
          autoPlay
          playsInline
          muted
          hidden={phase !== 'live'}
        />
        {phase === 'shot' && shot && <img className="camera__video" src={shot} alt="찍은 사진" />}
      </div>
      {tips}
      {error && (
        <p className="camera__error" role="alert">
          {error}
        </p>
      )}
      <div className="camera__actions">
        {phase === 'shot' ? (
          <>
            <Button variant="glass" onClick={() => setPhase('live')}>
              다시 찍기
            </Button>
            <Button variant="light" disabled={busy} onClick={async () => shot && finish(await (await fetch(shot)).blob())}>
              등록하기
            </Button>
          </>
        ) : (
          <>
            <Button variant="glass" disabled={busy} onClick={() => fileRef.current?.click()}>
              파일업로드
            </Button>
            <Button variant="light" onClick={capture} disabled={phase !== 'live'}>
              촬영하기
            </Button>
          </>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void finish(f);
        }}
      />
    </div>
  );
}
