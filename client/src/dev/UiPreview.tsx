import { useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  AppScreen,
  BottomSheet,
  Button,
  Calendar,
  Card,
  ChipSelect,
  FieldButton,
  Modal,
  Notice,
  PillButton,
  RemovableChip,
  ScreenTitle,
  StepHeader,
  TabBar,
  WheelPicker,
  type TabKey,
} from '../ui';

const LENGTHS = ['숏', '단발', '중단발', '장발'].map((v) => ({ value: v, label: v }));
const KINDS = ['클리닉', '매직', '염색', '펌', '탈색'].map((v) => ({ value: v, label: v }));

/** 개발 모드 전용: 공통 컴포넌트 확인용 화면. ?view=sheet|modal|tabs 로 열린 상태를 바로 본다 */
export default function UiPreview() {
  const [params] = useSearchParams();
  const view = params.get('view');
  const [length, setLength] = useState<string | null>('중단발');
  const [kind, setKind] = useState('염색');
  const [picked, setPicked] = useState<string>();
  const [sheet, setSheet] = useState(view === 'sheet');
  const [modal, setModal] = useState(view === 'modal');
  const [regions, setRegions] = useState(['동작구', '관악구']);
  const tab = (params.get('tab') as TabKey | null) ?? 'home';

  if (view === 'calendar') {
    return (
      <AppScreen>
        <BottomSheet open onClose={() => undefined} title="시술날짜 선택" footer={<Button>확인</Button>}>
          <Calendar value="2026-11-20" max="2026-11-27" onChange={() => undefined} />
        </BottomSheet>
      </AppScreen>
    );
  }

  if (view === 'tabs') {
    return (
      <AppScreen tone="white" tabBar={<TabBar active={tab} links={{ home: '/dev/ui?view=tabs&tab=home', requests: '/dev/ui?view=tabs&tab=requests', my: '/dev/ui?view=tabs&tab=my' }} />}>
        <Card banner="요청을 진행하고 있어요.">
          <Notice tone="info">
            확인하지 않은 응답이 <b>3개</b> 있어요!
          </Notice>
          <div className="button-row" style={{ marginTop: 16 }}>
            <Button variant="secondary" size="md">
              내리기
            </Button>
            <Button size="md">수정하기</Button>
          </div>
        </Card>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      header={<StepHeader step={2} label="모발확인" />}
      bottom={<Button onClick={() => setModal(true)}>다음</Button>}
    >
      <ScreenTitle title={'모발 상태가 맞는지\n확인해주세요.'} sub={'AI가 분석한 모발 데이터에요.\n다른 부분이 있다면 고쳐주세요.'} />

      <section style={{ marginTop: 47 }}>
        <h2 className="section-title">기장</h2>
        <p className="section-sub">AI 요약 - 머리끝이 어깨에 닿는 길이로 보여요.</p>
        <div style={{ marginTop: 9 }}>
          <ChipSelect label="기장" value={length} options={LENGTHS} onChange={setLength} />
        </div>
      </section>

      <section style={{ marginTop: 26 }}>
        <h2 className="section-title">숱</h2>
        <Notice tone="error">모발이 겹쳐 보여 숱을 정확히 확인하기 어려워요.</Notice>
      </section>

      <section style={{ marginTop: 26, display: 'flex', gap: 6 }}>
        <FieldButton icon="chevron" value={picked} placeholder="종류" onClick={() => setSheet(true)} style={{ width: 98 }} />
        <FieldButton icon="calendar" placeholder="시술 날짜" style={{ width: 204 }} />
      </section>

      <section style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <PillButton>+ 추가하기</PillButton>
        {regions.map((r) => (
          <RemovableChip key={r} label={r} onRemove={() => setRegions(regions.filter((x) => x !== r))} />
        ))}
      </section>

      <BottomSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="시술이력 선택"
        footer={
          <Button
            onClick={() => {
              setPicked(kind);
              setSheet(false);
            }}
          >
            확인
          </Button>
        }
      >
        <WheelPicker label="시술 종류" value={kind} options={KINDS} onChange={setKind} />
      </BottomSheet>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={'현재 디자이너에게\n요청하신 내역이 없어요.'}
        body={'제작하신 카드로 디자이너에게\n요청을 보내시겠어요?'}
        actions={
          <>
            <Button size="sm">디자이너 구하기 →</Button>
            <Button size="sm" variant="secondary" onClick={() => setModal(false)}>
              지금은 안할래요
            </Button>
          </>
        }
      />
    </AppScreen>
  );
}
