import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { MARKETPLACE_LIMITS, TIMINGS, type RequestCard, type RequestDetail, type Timing } from '@iroke/shared';
import { useFlow } from '../flow/FlowProvider';
import { AppScreen, Button, Checkbox, ChipSelect, Notice, ScreenTitle } from '../ui';
import exchangeIcon from '../ui/assets/exchange.svg';
import infoBlue from '../ui/assets/info-blue.png';
import { draftCards } from './cards';
import { BUDGET_LABELS, TIMING_LABELS, hairSummary, type BudgetChoice } from './labels';
import { customerApi } from './api';
import { originalOr } from './local';
import { PlainHeader, RequestCardRow } from './parts';
import { RegionChips, RegionSheet } from './RegionSheet';

const TIMING_OPTIONS = TIMINGS.map((value) => ({ value, label: TIMING_LABELS[value] }));
const BUDGET_OPTIONS = (['under_5', '5_10', '10_15', 'over_15', 'proposal'] as BudgetChoice[]).map((value) => ({ value, label: BUDGET_LABELS[value] }));

/**
 * 디자이너 구하기 - 자세정보 (Figma 535:3496) · 요청내역 - 수정하기 (535:2372).
 * 새 요청: /designer-request?card=<generationId> · 수정: /requests/:id/edit
 */
export function RequestForm() {
  const { id: editId } = useParams();
  const editing = Boolean(editId);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { state, promptVersion } = useFlow();

  const cards = draftCards(state, promptVersion);
  const picked = cards.find((c) => c.generationId === params.get('card')) ?? cards.find((c) => c.current) ?? cards[0];

  const [existing, setExisting] = useState<RequestDetail | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [timing, setTiming] = useState<Timing | null>(null);
  const [budget, setBudget] = useState<BudgetChoice | null>(null);
  const [consent, setConsent] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editId) return;
    customerApi
      .getRequest(editId)
      .then((r) => {
        setExisting(r);
        setRegions(r.regions);
        setTiming(r.timing);
        setBudget(r.budget ?? 'proposal');
      })
      .catch((e: Error) => setError(e.message));
  }, [editId]);

  const card: RequestCard | undefined = editing ? existing?.card : picked?.card;
  const image = editing ? (existing ? originalOr(existing.id, existing.designImageUrl) : null) : picked?.image;
  const full = regions.length >= MARKETPLACE_LIMITS.regionsMax;
  const ready = Boolean(card && regions.length && timing && budget && (editing || consent));

  // 이 탭에 만든 시안이 없으면 먼저 만들게 한다
  if (!editing && !picked) {
    return (
      <AppScreen header={<PlainHeader />} bottom={<Button onClick={() => navigate('/start')}>AI 시안 만들러 가기 →</Button>}>
        <ScreenTitle title={'먼저 AI 시안을\n만들어 주세요.'} sub="디자이너에게는 AI 시안 카드로 요청해요. 시안은 이 탭에서 만든 것만 쓸 수 있어요." />
      </AppScreen>
    );
  }

  const submit = async () => {
    if (!card || !timing || !budget) return;
    setBusy(true);
    setError('');
    try {
      const b = budget === 'proposal' ? null : budget;
      if (editing && editId) {
        await customerApi.updateRequest(editId, { regions, timing, budget: b });
        navigate('/requests', { replace: true });
      } else {
        await customerApi.createRequest(
          { card, regions, timing, budget: b, consent: { shareDesignWithVerifiedDesigners: true } },
          picked!.image,
        );
        navigate('/designer-request/done', { replace: true });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen
      header={<PlainHeader />}
      bottom={
        <>
          {error && <Notice tone="error">{error}</Notice>}
          <Button disabled={!ready || busy} onClick={submit}>
            {editing ? '수정 반영하기' : '요청 올리기 →'}
          </Button>
        </>
      }
    >
      <ScreenTitle title="어디서 시술 받고 싶나요?" sub="지역과 조건을 정하면 가능한 디자이너가 응답해요." />
      {!editing && cards.length > 1 && (
        <button type="button" className="text-icon-button req-swap" onClick={() => navigate(`/designer-request/cards?card=${picked!.generationId}`)}>
          <img src={exchangeIcon} alt="" />
          카드 바꾸기
        </button>
      )}
      {card && <RequestCardRow image={image} styleTag={card.styleTag} summary={hairSummary(card.profile)} />}

      <section className="req-section">
        <h2 className="section-title">시술 지역</h2>
        <button type="button" className="add-row" disabled={full} onClick={() => setSheet(true)}>
          <span aria-hidden="true">+</span>
          {full ? `지역은 ${MARKETPLACE_LIMITS.regionsMax}곳까지 고를 수 있어요` : '지역 추가하기'}
        </button>
        {regions.length > 0 && (
          <div className="u-chips req-regions">
            <RegionChips regions={regions} onChange={setRegions} />
          </div>
        )}
      </section>

      <section className="req-section">
        <h2 className="section-title">희망 시기</h2>
        <div className="req-chips">
          <ChipSelect label="희망 시기" value={timing} options={TIMING_OPTIONS} onChange={setTiming} />
        </div>
      </section>

      <section className="req-section">
        <h2 className="section-title">희망 예산대</h2>
        <div className="req-chips">
          <ChipSelect label="희망 예산대" value={budget} options={BUDGET_OPTIONS} onChange={setBudget} />
        </div>
      </section>

      <section className="scope-box">
        <p className="scope-box__title">
          <img src={infoBlue} alt="" width={25} height={19} />
          공개범위
        </p>
        <p className="scope-box__text">
          <b>게시판 목록:</b> 모발 정보 · 요청 · 난이도 · 예산대만
          <br />
          <b>얼굴을 가린 시안:</b> 인증된 디자이너만
          <br />
          7일 뒤 마감되면 시안은 자동 비공개
          <br />
          원본 셀카는 올리지 않아요
        </p>
        {!editing && (
          <div className="scope-box__consent">
            <Checkbox checked={consent} onChange={setConsent}>
              <strong>[필수]</strong> 얼굴을 가린 AI 시안과 모발 정보를 IROKE 서버에 올리는 데 동의해요
            </Checkbox>
          </div>
        )}
      </section>

      <RegionSheet open={sheet} onClose={() => setSheet(false)} regions={regions} onChange={setRegions} title="시술 지역 추가" />
    </AppScreen>
  );
}
