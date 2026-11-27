import { useState } from 'react';
import { useAuth } from '../account/AuthProvider';
import { useNavigate } from 'react-router';
import { resizeMaxEdge } from '../flow/lib/image';
import { PlainHeader } from '../customer/parts';
import { RegionChips, RegionSheet } from '../customer/RegionSheet';
import { AppScreen, Button, CameraCapture, Notice, PillButton, ScreenTitle, TextField } from '../ui';
import cameraIcon from '../ui/assets/camera.svg';
import tipLandscape from '../ui/assets/tip-landscape.svg';
import tipLight from '../ui/assets/tip-light.svg';
import tipSharp from '../ui/assets/tip-sharp.svg';
import uploadDone from '../ui/assets/upload-done.svg';
import { designerApi } from './api';

/** 서버(httpsUrl)와 같은 규칙: URL로 읽히고 https */
const isHttpsUrl = (v: string) => {
  try {
    return new URL(v).protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * 디자이너 등록 (Figma 547:4759 업로드 전 · 547:5024 업로드 완료 · 547:4958 면허증 촬영)
 * 프로필 수정 (547:6073): 면허증을 다시 올리면 재인증, 아니면 매장 정보만 바꾼다.
 */
export function Register({ edit = false }: { edit?: boolean }) {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const me = user?.designer;
  const [camera, setCamera] = useState(false);
  const [license, setLicense] = useState<string>();
  const [name, setName] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [regions, setRegions] = useState<string[]>(edit ? (me?.regions ?? []) : []);
  const [shopName, setShopName] = useState(edit ? (me?.shopName ?? '') : '');
  const [bookingUrl, setBookingUrl] = useState(edit ? (me?.bookingUrl ?? '') : '');
  const [instagram, setInstagram] = useState(edit ? (me?.instagram ?? '') : '');
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // 면허는 처음 등록할 때와 반려됐을 때만 다시 낼 수 있다 (백엔드 규칙). 인증 대기·완료면 매장 정보만 고친다
  const canReverify = !edit || me?.verifyStatus === 'rejected';
  const reverify = !edit || (canReverify && Boolean(license));
  const nameError = name.trim() && (name.trim().length < 2 || name.trim().length > 20) ? '이름은 2~20자로 적어 주세요.' : '';
  const licenseError = licenseNo.trim() && !/^[0-9A-Za-z-]{4,30}$/.test(licenseNo.trim()) ? '면허번호는 숫자·영문·하이픈 4~30자예요.' : '';
  // 서버 규칙과 같게 먼저 확인한다 (틀리면 면허증 사진을 올리기 전에 알려 준다)
  const urlError = bookingUrl.trim() && !isHttpsUrl(bookingUrl.trim()) ? '예약링크는 https:// 로 시작하는 주소여야 해요.' : '';
  const instaError = instagram.trim() && !/^@?[A-Za-z0-9._]{1,30}$/.test(instagram.trim()) ? '인스타 계정은 영문·숫자·마침표·밑줄 30자 이내로 적어 주세요. (예: @iroke.hair)' : '';
  const ready =
    regions.length > 0 && shopName.trim() && bookingUrl.trim() && !urlError && !instaError && (!reverify || (license && name.trim() && licenseNo.trim() && !nameError && !licenseError));

  if (camera) {
    return (
      <CameraCapture
        facing="environment"
        frame={{ width: 342, height: 207 }}
        guide={'영역 안에 면허증이 꽉 차도록 맞추고\n촬영 버튼을 눌러 주세요.'}
        tips={
          <ul className="license-tips">
            <li>
              <img src={tipLight} alt="" />
              빛 반사가 없도록
              <br />
              촬영해주세요
            </li>
            <li>
              <img src={tipSharp} alt="" />
              정보를 선명하게
              <br />
              보여주세요
            </li>
            <li>
              <img src={tipLandscape} alt="" />
              가로 방향으로
              <br />
              촬영해주세요
            </li>
          </ul>
        }
        process={(f) => resizeMaxEdge(f)}
        onDone={(img) => {
          setLicense(img);
          setCamera(false);
        }}
        onBack={() => setCamera(false)}
      />
    );
  }

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const info = { regions, shopName: shopName.trim(), bookingUrl: bookingUrl.trim(), instagram: instagram.trim() || null };
      if (reverify) await designerApi.submitVerification({ ...info, name: name.trim(), licenseNumber: licenseNo.trim() }, license!);
      else await designerApi.updateMe(info);
      // 등록 상태·매장 정보가 바뀌었으니 내 정보를 다시 읽는다 (게시판 접근 여부가 여기서 정해진다)
      await refreshUser();
      navigate(edit ? '/pro/my' : '/pro/my', { replace: true, state: { notice: reverify ? 'verify' : 'saved' } });
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
            {edit ? (reverify ? '재인증 요청하기' : '수정 반영하기') : '인증 요청하기'}
          </Button>
        </>
      }
    >
      <ScreenTitle title={edit ? '프로필 수정하기' : '미용사 면허를 인증해 주세요.'} sub="인증된 디자이너만 손님 요청에 응답할 수 있어요." />

      <section className="reg-section">
        <p className="u-field__label">면허증 사진</p>
        <button type="button" className={`license-box${license || edit ? ' is-done' : ''}`} onClick={() => setCamera(true)} disabled={!canReverify}>
          {license || edit ? <img className="license-box__done" src={uploadDone} alt="" /> : <img src={cameraIcon} alt="" />}
          <span>
            {license
              ? '업로드를 완료했어요!'
              : !edit
                ? '클릭해서 면허증을 올려보세요!'
                : canReverify
                  ? '다시 등록하려면 클릭해주세요!'
                  : me?.verifyStatus === 'verified'
                    ? '면허 인증을 마쳤어요'
                    : '면허를 확인하고 있어요'}
          </span>
        </button>
      </section>

      {reverify && (
        <>
          <TextField className="reg-section" label="이름" value={name} onChange={setName} clearable placeholder="면허증에 적힌 이름" autoComplete="name" />
          {nameError && <Notice tone="error">{nameError}</Notice>}
          <TextField className="reg-section" label="면허번호" value={licenseNo} onChange={setLicenseNo} placeholder="면허번호를 입력해주세요." inputMode="numeric" />
          {licenseError && <Notice tone="error">{licenseError}</Notice>}
          <p className="reg-hint">이름·면허번호는 확인에만 쓰고 저장하지 않아요.</p>
        </>
      )}

      <section className="reg-section">
        <p className="u-field__label">활동지역</p>
        <div className="u-chips">
          <RegionChips regions={regions} onChange={setRegions} />
          {regions.length < 2 && <PillButton onClick={() => setSheet(true)}>+ 추가하기</PillButton>}
        </div>
      </section>
      <TextField className="reg-section" label="매장이름" value={shopName} onChange={setShopName} placeholder="예: 숭실헤어 상도점" />
      <TextField className="reg-section" label="예약링크" value={bookingUrl} onChange={setBookingUrl} placeholder="https://booking.naver.com/..." inputMode="url" />
      {urlError && <Notice tone="error">{urlError}</Notice>}
      <TextField className="reg-section" label="인스타계정 (선택)" value={instagram} onChange={setInstagram} placeholder="@아이디" />
      {instaError && <Notice tone="error">{instaError}</Notice>}

      <p className="info-box reg-info">{'인증은 영업일 기준 1~2일 걸려요.\n인증 전에는 게시판을 볼 수만 있어요.'}</p>
      <RegionSheet open={sheet} onClose={() => setSheet(false)} regions={regions} onChange={setRegions} title="활동지역 추가" />
    </AppScreen>
  );
}
