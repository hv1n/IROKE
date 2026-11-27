import { useNavigate, useSearchParams } from 'react-router';
import { useFlow } from '../flow/FlowProvider';
import { AppScreen, ScreenTitle } from '../ui';
import { draftCards } from './cards';
import { hairSummary } from './labels';
import { PlainHeader, RequestCardRow } from './parts';

/** 디자이너 구하기 - 카드 바꾸기 (Figma 535:3567). 이 탭에서 만든 시안 중에서 고른다 */
export function CardPicker() {
  const { state, promptVersion } = useFlow();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const cards = draftCards(state, promptVersion);
  const selected = params.get('card') ?? cards.find((c) => c.current)?.generationId;
  return (
    <AppScreen header={<PlainHeader />}>
      <ScreenTitle title="카드 바꾸기" sub="요청하고 싶은 AI 시안을 골라보세요." />
      <div className="card-list">
        {cards.map((c) => (
          <RequestCardRow
            key={c.generationId}
            image={c.image}
            styleTag={c.card.styleTag}
            summary={hairSummary(c.card.profile)}
            selected={c.generationId === selected}
            onClick={() => navigate(`/designer-request?card=${c.generationId}`, { replace: true })}
          />
        ))}
      </div>
    </AppScreen>
  );
}
