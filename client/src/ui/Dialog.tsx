import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import close14 from './assets/close-14.svg';
import closeIcon from './assets/close.svg';
import infoIcon from './assets/info-lg.svg';

interface DialogProps {
  open: boolean;
  /** Esc·바깥 누름·닫기 버튼 */
  onClose: () => void;
  className: string;
  labelledBy: string;
  children: ReactNode;
}

/** native <dialog>: 포커스 가둠·Esc·배경 처리를 브라우저에 맡긴다 */
function Dialog({ open, onClose, className, labelledBy, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // 내용은 dialog가 열린 뒤에 그린다 (휠 목록 등이 보이는 상태에서 위치를 잡도록)
  const [shown, setShown] = useState(false);
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // 첫 버튼에 포커스 링이 뜨지 않게 dialog 자체에 포커스. Tab을 누르면 첫 버튼으로 간다
      d.focus();
    }
    if (!open && d.open) d.close();
    setShown(open);
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`u-dialog ${className}`}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // 배경(::backdrop)을 누르면 dialog 자신이 target이 된다
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {shown && children}
    </dialog>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** confirm: 왼쪽 정렬·흰 배경·버튼 가로 배치 (정말 내리시겠어요?) */
  layout?: 'center' | 'confirm';
  /** 오른쪽 위 X */
  closeButton?: boolean;
  body?: ReactNode;
  /** 버튼들 (위가 주 버튼). 없으면 X로만 닫는다 */
  actions?: ReactNode;
  /** 맨 위 i 아이콘 */
  icon?: boolean;
  /** 아이콘 대신 맨 위 작은 갈색 글자 (NEW) */
  eyebrow?: string;
}

/** 가운데 팝업 (디자이너 구할까요?, 요청 내리기 확인 등) */
export function Modal({ open, onClose, title, body, actions, icon = true, eyebrow, layout = 'center', closeButton }: ModalProps) {
  const id = useId();
  return (
    <Dialog open={open} onClose={onClose} className={`modal${layout === 'confirm' ? ' modal--confirm' : ''}`} labelledBy={id}>
      {closeButton && (
        <button type="button" className="u-icon-button modal__close" onClick={onClose} aria-label="닫기">
          <img src={close14} alt="" />
        </button>
      )}
      <div className="modal__inner">
        {layout === 'confirm' ? null : eyebrow ? <p className="modal__eyebrow">{eyebrow}</p> : icon && <img src={infoIcon} alt="" />}
        <h2 id={id} className="modal__title">
          {title}
        </h2>
        {body && <p className="modal__body">{body}</p>}
        {actions && <div className="modal__actions">{actions}</div>}
      </div>
    </Dialog>
  );
}

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** X 대신 위쪽 손잡이 막대 (디자이너 확정 시트) */
  handle?: boolean;
  children: ReactNode;
  /** 아래 버튼 (확인) */
  footer?: ReactNode;
}

/** 아래에서 올라오는 시트 (시술이력 선택, 날짜 선택, 디자이너 확정 등) */
export function BottomSheet({ open, onClose, title, children, footer, handle }: BottomSheetProps) {
  const id = useId();
  return (
    <Dialog open={open} onClose={onClose} className={`sheet${handle ? ' sheet--handle' : ''}`} labelledBy={id}>
      {handle && <span className="sheet__handle" aria-hidden="true" />}
      <div className="sheet__head">
        <h2 id={id} className="sheet__title">
          {title}
        </h2>
        {!handle && (
          <button type="button" className="u-icon-button" onClick={onClose} aria-label="닫기">
            <img src={closeIcon} alt="" />
          </button>
        )}
      </div>
      <div className="sheet__body">{children}</div>
      {footer && <div className="sheet__foot">{footer}</div>}
    </Dialog>
  );
}
