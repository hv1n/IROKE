import { useNavigate } from 'react-router';
import { Button, Notice, PhotoCard, PillButton } from '../../ui';
import { useFlow } from '../FlowProvider';
import { resizeMaxEdge } from '../lib/image';
import { uuid } from '../lib/storage';
import { FlowScreen } from '../ui/FlowScreen';
import { usePhotoPicker } from '../ui/usePhotoPicker';

/** 3/6 레퍼런스 (Figma 459:526 · 459:545) */
export function ReferenceStep() {
  const { state, dispatch } = useFlow();
  const navigate = useNavigate();
  const picker = usePhotoPicker(
    (file) => resizeMaxEdge(file),
    (reference) => dispatch({ type: 'setReference', reference, referenceId: uuid() }),
  );

  return (
    <FlowScreen
      step={2}
      title={'하고 싶은 헤어스타일을\n업로드 해주세요.'}
      sub={'사진을 올리면 AI가 헤어스타일을 분석해요.\n얼굴·모질은 빼고 컷·형태·앞머리만 참고해요.'}
      bottom={
        <Button disabled={!state.reference} onClick={() => navigate('/flow/style')}>
          다음
        </Button>
      }
    >
      <div className="flow-photo">
        <PhotoCard image={state.reference} alt="올린 레퍼런스 사진" onPick={picker.open} disabled={picker.busy} />
        {state.reference ? (
          <div className="photo-actions">
            <PillButton onClick={picker.open} disabled={picker.busy}>
              다시 업로드하기
            </PillButton>
          </div>
        ) : (
          <p className="photo-caption">{picker.busy ? '사진을 준비하고 있어요…' : '눌러서 레퍼런스 사진을 올려보세요!'}</p>
        )}
        {picker.error && <Notice tone="error">{picker.error}</Notice>}
      </div>
      {picker.input}
    </FlowScreen>
  );
}
