import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { BackButton, Button } from '../../ui';
import { useFlow } from '../FlowProvider';
import { normalizeSelfie } from '../lib/image';
import { uuid } from '../lib/storage';
import { usePhotoPicker } from '../ui/usePhotoPicker';

type Phase = 'starting' | 'live' | 'shot' | 'unavailable';

/**
 * 1/6 셀카 촬영 (Figma 459:1008).
 * 디자인의 "자동으로 촬영돼요"는 얼굴 검출이 필요해 이번에는 셔터를 눌러 찍는다.
 * 카메라를 못 쓰면(권한 거부·데스크톱) 파일업로드만 남긴다.
 */
export function CameraStep() {
  const { dispatch } = useFlow();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>('starting');
  const [shot, setShot] = useState<string>();
  const [busy, setBusy] = useState(false);

  const done = (selfie: string) => {
    dispatch({ type: 'setSelfie', selfie, selfieId: uuid() });
    navigate('/start', { replace: true });
  };
  const picker = usePhotoPicker(normalizeSelfie, done);

  useEffect(() => {
    let alive = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase('unavailable');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1706 } }, audio: false })
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
  }, []);

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

  const register = async () => {
    if (!shot) return;
    setBusy(true);
    try {
      done(await normalizeSelfie(await (await fetch(shot)).blob()));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="camera">
      <div className="camera__top">
        <BackButton light onClick={() => navigate('/start')} />
      </div>
      <p className="camera__guide">
        {phase === 'unavailable' ? (
          <>
            카메라를 쓸 수 없어요.
            <br />
            파일업로드로 셀카를 올려 주세요.
          </>
        ) : (
          <>
            영역 안에 얼굴을 맞추고
            <br />
            촬영 버튼을 눌러 주세요.
          </>
        )}
      </p>
      <div className="camera__frame">
        <video ref={videoRef} className="camera__video" autoPlay playsInline muted hidden={phase !== 'live'} />
        {phase === 'shot' && shot && <img className="camera__video" src={shot} alt="찍은 셀카" />}
      </div>
      <ul className="camera__tips">
        <li>정면을 바라봐주세요.</li>
        <li>이마, 귀, 머리 전체가 보이게 해주세요.</li>
        <li>밝은 곳에서 촬영해주세요.</li>
        <li>모자, 마스크, 필터가 없어야 해요.</li>
      </ul>
      {picker.error && (
        <p className="camera__error" role="alert">
          {picker.error}
        </p>
      )}
      <div className="camera__actions">
        {phase === 'shot' ? (
          <>
            <Button variant="glass" onClick={() => setPhase('live')}>
              다시 찍기
            </Button>
            <Button variant="light" onClick={register} disabled={busy}>
              등록하기
            </Button>
          </>
        ) : (
          <>
            <Button variant="glass" onClick={picker.open} disabled={picker.busy}>
              파일업로드
            </Button>
            <Button variant="light" onClick={capture} disabled={phase !== 'live'}>
              촬영하기
            </Button>
          </>
        )}
      </div>
      {picker.input}
    </div>
  );
}
