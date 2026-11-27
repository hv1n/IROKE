import { useEffect, useState } from 'react';
import { BUDGETS, DIFFICULTIES, TREATMENT_LABELS, TREATMENT_TYPES, type AlertSettings } from '@iroke/shared';
import { useAuth } from '../account/AuthProvider';
import { BUDGET_LABELS } from '../customer/labels';
import { BottomSheet, Button, Checkbox, ChipMulti, Notice } from '../ui';
import { designerApi } from './api';
import { DIFFICULTY_LABELS } from './labels';

const district = (r: string) => r.split(' ').slice(1).join(' ') || r;

/**
 * 새 요청 알림 조건 (WF-D2 [알림 설정]: 조건에 맞는 요청만 알림, 지역 전체 알림 X).
 * 칸마다 아무것도 고르지 않으면 전부 받는다. 지역은 내 활동 지역 안에서만.
 */
export function AlertSettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const designer = useAuth().user?.designer;
  const [s, setS] = useState<AlertSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    designerApi
      .alertSettings()
      .then(setS)
      .catch((e: Error) => setError(e.message));
  }, [open]);

  const set = <K extends keyof AlertSettings>(k: K, v: AlertSettings[K]) => setS((prev) => (prev ? { ...prev, [k]: v } : prev));
  const save = async () => {
    if (!s) return;
    setBusy(true);
    setError('');
    try {
      await designerApi.saveAlertSettings(s);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const regions = designer?.regions ?? [];
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="알림 설정"
      footer={
        <Button disabled={!s || busy} onClick={save}>
          저장하기
        </Button>
      }
    >
      {designer && designer.verifyStatus !== 'verified' && <Notice tone="info">면허 인증이 끝나면 새 요청 알림이 와요.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {s && (
        <div className="alert-settings">
          <Checkbox checked={s.enabled} onChange={(v) => set('enabled', v)}>
            조건에 맞는 새 요청이 오면 알려 주세요
          </Checkbox>
          <fieldset className="alert-settings__fields" disabled={!s.enabled}>
            <p className="section-sub">고르지 않은 항목은 전부 받아요.</p>
            <section>
              <h3 className="alert-settings__title">지역</h3>
              <ChipMulti label="알림 받을 지역" values={s.regions} options={regions.map((r) => ({ value: r, label: district(r) }))} onChange={(v) => set('regions', v)} />
            </section>
            <section>
              <h3 className="alert-settings__title">시술 종류</h3>
              <ChipMulti
                label="알림 받을 시술 종류"
                values={s.treatmentTypes}
                options={TREATMENT_TYPES.map((t) => ({ value: t, label: TREATMENT_LABELS[t] }))}
                onChange={(v) => set('treatmentTypes', v)}
              />
            </section>
            <section>
              <h3 className="alert-settings__title">난이도</h3>
              <ChipMulti
                label="알림 받을 난이도"
                values={s.difficulties}
                options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
                onChange={(v) => set('difficulties', v)}
              />
            </section>
            <section>
              <h3 className="alert-settings__title">예산대</h3>
              <ChipMulti label="알림 받을 예산대" values={s.budgets} options={BUDGETS.map((b) => ({ value: b, label: BUDGET_LABELS[b] }))} onChange={(v) => set('budgets', v)} />
            </section>
          </fieldset>
        </div>
      )}
    </BottomSheet>
  );
}
