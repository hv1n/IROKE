import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../account/AuthProvider';
import { Header } from '../components/Header';
import { Hero, HomeLink } from '../components/Hero';
import { Button, Modal, TabBar } from '../ui';
import { designerApi } from './mockApi';
import { DESIGNER_TABS, DESIGNER_TAB_LABELS } from './tabs';

/** 디자이너 홈 (Figma 547:4808 등록전 · 547:5192 등록후 · 547:5236 미등록 안내) */
export function DesignerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const registered = Boolean(designerApi.me());
  const [ask, setAsk] = useState(params.get('needRegister') === '1');

  const close = () => {
    setAsk(false);
    if (params.has('needRegister')) setParams({}, { replace: true });
  };

  return (
    <div className={`page${user ? ' page--tabbar' : ''}`}>
      <Header role="designer" />
      <Hero
        actions={
          registered ? (
            <HomeLink to="/pro/board">요청 보러 가기 →</HomeLink>
          ) : (
            <HomeLink to="/pro/register">디자이너 등록하기 →</HomeLink>
          )
        }
      />
      {user && (
        <TabBar
          active="home"
          links={DESIGNER_TABS}
          labels={DESIGNER_TAB_LABELS}
          onSelect={(key, e) => {
            if (!registered && key !== 'home') {
              e.preventDefault();
              setAsk(true);
            }
          }}
        />
      )}
      <Modal
        open={ask}
        onClose={close}
        title={'해당기능은 디자이너를\n등록해야 가능해요!'}
        body={'지금 바로 나의 미용실과\n디자이너를 등록해보세요!'}
        actions={
          <>
            <Button size="sm" onClick={() => navigate('/pro/register')}>
              디자이너 등록하기 →
            </Button>
            <Button size="sm" variant="secondary" onClick={close}>
              지금은 안할래요
            </Button>
          </>
        }
      />
    </div>
  );
}
