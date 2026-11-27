import { useNavigate } from 'react-router';
import { Button, Checkbox, PhotoCard, PillButton } from '../../ui';
import { useFlow } from '../FlowProvider';
import { FlowScreen } from '../ui/FlowScreen';

/** 1/6 셀카등록 (Figma 459:393 · 459:347 · 459:370) */
export function SelfieStep() {
  const { state, dispatch } = useFlow();
  const navigate = useNavigate();
  const ready = state.consent && Boolean(state.selfie);
  const toCamera = () => navigate('/start/camera');

  return (
    <FlowScreen
      step={0}
      title={'본인의 정면 셀카를\n올려주세요.'}
      sub="머리가 잘 보일수록 정확해져요."
      bottom={
        <Button disabled={!ready} onClick={() => navigate(state.profileSource ? '/flow/reference' : '/flow/profile')}>
          다음
        </Button>
      }
    >
      <div className="flow-photo">
        <PhotoCard image={state.selfie} alt="올린 셀카" onPick={toCamera} />
        {state.selfie ? (
          <div className="photo-actions">
            <PillButton onClick={toCamera}>다시 업로드하기</PillButton>
          </div>
        ) : (
          <p className="photo-caption">눌러서 본인의 셀카를 올려보세요!</p>
        )}
      </div>

      {/* TODO(정책): 법률 검토 전 초안. 문구가 확정되면 교체한다. */}
      <fieldset className="consent-box">
        <legend className="visually-hidden">사진 처리 동의</legend>
        <Checkbox checked={state.consent} onChange={(consent) => dispatch({ type: 'setConsent', consent })}>
          <strong>[필수]</strong> 만 18세 이상이며, 아래 사진 처리 방식에 동의해요
        </Checkbox>
        <ul className="consent-box__list">
          <li>사진은 분석·시안 생성을 위해서만 Google(Gemini)로 전송돼요.</li>
          <li>시안을 만드는 동안 IROKE 서버에는 사진을 저장하지 않아요.</li>
          <li>확정한 모발 프로필(사진 제외)만 이 브라우저에 저장돼요.</li>
        </ul>
        <details className="consent-box__more">
          <summary>자세히</summary>
          <ul className="consent-box__list">
            <li>Google은 이 사진을 서비스 개선에 쓰지 않고, 악용 방지를 위해 정해진 기간만 기록해요.</li>
            <li>사진과 결과는 이 브라우저 탭에만 임시로 남고, 탭을 닫거나 [처음부터]를 두 번 누르면 지워져요.</li>
            <li>디자이너 구하기를 쓸 때만 따로 동의를 받아 얼굴을 가린 시안을 올려요.</li>
          </ul>
        </details>
      </fieldset>
    </FlowScreen>
  );
}
