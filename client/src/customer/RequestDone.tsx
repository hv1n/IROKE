import { useNavigate } from 'react-router';
import { AppScreen, Button } from '../ui';
import doneIcon from '../ui/assets/done-check.svg';
import { PlainHeader } from './parts';

/** 디자이너 구하기 - 완료 (Figma 521:2013) */
export function RequestDone() {
  const navigate = useNavigate();
  return (
    <AppScreen header={<PlainHeader onBack={() => navigate('/requests', { replace: true })} />} bottom={<Button onClick={() => navigate('/requests', { replace: true })}>확인</Button>}>
      <div className="done">
        <img src={doneIcon} alt="" />
        <h1>
          디자이너에게
          <br />
          요청을 보냈어요!
        </h1>
        <p>
          디자이너의 응답은
          <br />
          요청내역 탭에서 확인할 수 있어요!
        </p>
      </div>
    </AppScreen>
  );
}
