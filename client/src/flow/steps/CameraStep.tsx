import { useNavigate } from 'react-router';
import { CameraCapture } from '../../ui/CameraCapture';
import { useFlow } from '../FlowProvider';
import { normalizeSelfie } from '../lib/image';
import { uuid } from '../lib/storage';

/** 1/6 셀카 촬영 (Figma 459:1008) */
export function CameraStep() {
  const { dispatch } = useFlow();
  const navigate = useNavigate();
  return (
    <CameraCapture
      facing="user"
      frame={{ width: 258, height: 329 }}
      guide={'영역 안에 얼굴을 맞추고\n촬영 버튼을 눌러 주세요.'}
      tips={
        <ul className="camera__tips">
          <li>정면을 바라봐주세요.</li>
          <li>이마, 귀, 머리 전체가 보이게 해주세요.</li>
          <li>밝은 곳에서 촬영해주세요.</li>
          <li>모자, 마스크, 필터가 없어야 해요.</li>
        </ul>
      }
      process={normalizeSelfie}
      onDone={(selfie) => {
        dispatch({ type: 'setSelfie', selfie, selfieId: uuid() });
        navigate('/start', { replace: true });
      }}
      onBack={() => navigate('/start')}
    />
  );
}
