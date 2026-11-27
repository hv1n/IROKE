import { Modal } from '../ui';
import { GRADES } from './grade';

/** 요청내역 - 가위등급보기 (Figma 546:3756) */
export function GradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeButton
      title={'가위는 시술 횟수와\n만족도를 보여주는 지수에요!'}
      body={
        <span className="grade-list">
          <span className="grade-list__note">온도와 완료 시술 수를 둘 다 넘어야 올라가요.</span>
          {GRADES.map((g) => (
            <span key={g.grade} className="grade-list__row">
              <img src={g.icon} alt="" width={20} height={20} />
              <b>{g.name}</b> {g.desc}
              {g.grade !== 'normal' && (
                <small>
                  {g.minTemperature.toFixed(1)}℃ · {g.minCompleted}건{g.noRecentDispute ? ' · 90일 이의 0건' : ''}
                </small>
              )}
            </span>
          ))}
        </span>
      }
    />
  );
}
