import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { BottomSheet, Button, Modal, PillButton } from '../../ui';
import pencilWhite from '../../ui/assets/pencil-white.svg';
import refreshIcon from '../../ui/assets/refresh.svg';
import remakeOther from '../../ui/assets/remake-other.png';
import remakeSame from '../../ui/assets/remake-same.png';
import { useFlow } from '../FlowProvider';
import { canvasToBlob, renderCard } from '../lib/card';
import { historyKinds, profileSummary } from '../lib/labels';
import { buildRequestNote } from '../lib/requestNote';
import { currentGeneration } from '../lib/state';
import { BeforeAfter } from '../ui/BeforeAfter';
import { FlowScreen } from '../ui/FlowScreen';

const fileName = () => `iroke-hair-card-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.png`;

/**
 * 6/6 전달카드.
 * - 시안완성 (Figma 459:648) + 다시제작 시트 (459:734)
 * - ?view=card 카드제작완성 (459:668) + 디자이너 구할까요? 팝업 (521:2138, 로그인 분기는 3단계)
 */
export function CardStep() {
  const { state, dispatch, status, promptVersion, startGeneration } = useFlow();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'card' ? 'card' : 'result';
  const result = currentGeneration(state, promptVersion);
  const { selfie, profile, styleTag } = state;

  const autoNote = useMemo(() => (profile && styleTag ? buildRequestNote(profile, styleTag) : ''), [profile, styleTag]);
  const note = state.requestNote ?? autoNote;

  const [remake, setRemake] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(note);
  const [askDesigner, setAskDesigner] = useState(false);
  const [message, setMessage] = useState('');
  const blobRef = useRef<Blob | null>(null);
  const [ready, setReady] = useState(false);

  // 저장할 PNG를 미리 그려 둔다 (입력이 멈추면 다시 그림)
  useEffect(() => {
    if (view !== 'card' || !result || !selfie || !profile || !styleTag) return;
    let alive = true;
    setReady(false);
    const id = window.setTimeout(async () => {
      try {
        const blob = await canvasToBlob(await renderCard({ after: result.image, before: selfie, styleTag, profile, note, date: new Date() }));
        if (!alive) return;
        blobRef.current = blob;
        setReady(true);
      } catch (err) {
        console.error('[card] 그리기 실패', err);
      }
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [view, result, selfie, profile, styleTag, note]);

  if (!result || !selfie || !profile || !styleTag) return null;

  /** 휴대폰은 공유 시트(사진 앱에 저장 포함), 그 외는 바로 내려받기 */
  const save = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    const file = new File([blob], fileName(), { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'IROKE 헤어 카드', text: styleTag });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName();
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('이미지를 저장했어요.');
  };

  if (view === 'result') {
    return (
      <FlowScreen
        step={5}
        title={`${styleTag} 시안이\n완성되었어요!`}
        sub="가운데 선을 밀어 지금 모습과 비교해 보세요."
        onBack={() => navigate('/flow/generate')}
        bottom={<Button onClick={() => setParams({ view: 'card' })}>전달 카드 만들기 →</Button>}
      >
        <div className="flow-photo">
          <div className="photo-card photo-card--lg">
            <BeforeAfter before={selfie} after={result.image} />
          </div>
          <div className="photo-actions">
            <PillButton onClick={() => setRemake(true)}>
              <img src={refreshIcon} alt="" />
              다시 만들기
            </PillButton>
          </div>
          {status?.mode === 'mock' && <p className="photo-caption">MOCK 모드라 셀카가 그대로 돌아와요.</p>}
        </div>

        <BottomSheet open={remake} onClose={() => setRemake(false)} title="다시 만드시겠어요?">
          <div className="remake">
            <button
              type="button"
              className="remake__tile"
              onClick={() => {
                startGeneration();
                navigate('/flow/generate');
              }}
            >
              <img src={remakeSame} alt="" width={72} height={72} />
              같은 조건으로 →
            </button>
            <button type="button" className="remake__tile" onClick={() => navigate('/flow/reference')}>
              <img src={remakeOther} alt="" width={78} height={78} />
              다른 조건으로 →
            </button>
          </div>
        </BottomSheet>
      </FlowScreen>
    );
  }

  const cells: [string, string][] = [...profileSummary(profile), ['시술 이력', historyKinds(profile)]];

  return (
    <FlowScreen
      step={5}
      tone="dark"
      title={'미용사님께 이 카드를\n보여주세요!'}
      sub="시안과 내 모발 상태, 요청 사항을 한 장에 담았어요."
      onBack={() => setParams({})}
      bottom={
        <div className="button-row">
          <Button variant="glass" onClick={save} disabled={!ready}>
            이미지저장
          </Button>
          <Button onClick={() => setAskDesigner(true)}>기록하기</Button>
        </div>
      }
    >
      <div className="hair-card">
        <div className="hair-card__photo">
          <img src={result.image} alt={`${styleTag} AI 시안`} />
          <div className="hair-card__info">
            <p className="hair-card__style">{styleTag}</p>
            <dl className="hair-card__grid">
              {cells.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="hair-card__note">
          <p className="hair-card__note-title">
            요청사항
            <button
              type="button"
              className="u-icon-button"
              aria-label="요청사항 고치기"
              onClick={() => {
                setNoteDraft(note);
                setNoteOpen(true);
              }}
            >
              <img src={pencilWhite} alt="" />
            </button>
          </p>
          <p className="hair-card__note-text">{note}</p>
        </div>
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">
        {message}
      </p>
      {message && <p className="photo-caption photo-caption--light">{message}</p>}

      <BottomSheet
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="요청사항"
        footer={
          <Button
            onClick={() => {
              dispatch({ type: 'setRequestNote', requestNote: noteDraft === autoNote ? undefined : noteDraft });
              setNoteOpen(false);
            }}
          >
            확인
          </Button>
        }
      >
        <textarea
          className="u-textarea"
          rows={6}
          maxLength={400}
          value={noteDraft}
          aria-label="미용사에게 전할 말"
          onChange={(e) => setNoteDraft(e.target.value)}
        />
        {noteDraft !== autoNote && (
          <button type="button" className="flow-text-button" onClick={() => setNoteDraft(autoNote)}>
            자동 문구로 되돌리기
          </button>
        )}
      </BottomSheet>

      {/* 로그인 여부에 따른 분기·카카오 로그인은 3단계에서 연결한다 */}
      <Modal
        open={askDesigner}
        onClose={() => setAskDesigner(false)}
        eyebrow="NEW"
        title={'이 카드로 디자이너를\n구해볼까요?'}
        body={'디자이너에게 시안을 제안하려면\n로그인이 필요해요.'}
        actions={
          <>
            <Button size="sm" onClick={() => navigate('/')}>
              로그인하러 가기 →
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAskDesigner(false)}>
              지금은 안할래요
            </Button>
          </>
        }
      />
    </FlowScreen>
  );
}
