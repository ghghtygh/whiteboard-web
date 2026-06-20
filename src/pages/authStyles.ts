/**
 * 인증 화면(로그인/회원가입/소셜 콜백) 공유 스타일.
 * 디자인 시스템 명세: 50/50 분할 — 왼쪽 인디고 브랜드 패널(유일한
 * 그라데이션), 오른쪽 흰 카드. 760px 미만에서 브랜드 패널은 접힌다.
 */
export const authStyles = `
  .auth-split {
    min-height: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  /* ---------- 좌측 브랜드 패널 (인디고 그라데이션) ---------- */
  .auth-brand {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 48px;
    color: #fff;
    background:
      radial-gradient(circle at 18% 22%, rgba(255,255,255,0.16) 1.2px, transparent 1.2px) 0 0 / 26px 26px,
      linear-gradient(150deg, var(--indigo-600) 0%, var(--indigo-800) 100%);
    overflow: hidden;
  }
  .auth-brand .brand-mark {
    display: inline-flex; align-items: center; gap: 10px;
    font: var(--weight-extra) var(--text-xl)/1 var(--font-sans);
    letter-spacing: var(--tracking-tight);
  }
  .auth-brand .brand-dot {
    width: 14px; height: 14px; border-radius: 4px;
    background: #fff;
    box-shadow: 0 0 0 4px rgba(255,255,255,0.18);
  }
  .auth-brand .brand-pitch { max-width: 30ch; }
  .auth-brand .eyebrow {
    margin: 0 0 14px;
    font: var(--weight-semibold) var(--text-2xs)/1 var(--font-sans);
    letter-spacing: var(--tracking-caps);
    color: rgba(255,255,255,0.72);
  }
  .auth-brand h2 {
    margin: 0; color: #fff;
    font: var(--weight-extra) var(--text-4xl)/var(--leading-tight) var(--font-sans);
    letter-spacing: var(--tracking-tight);
  }
  .auth-brand .brand-sub {
    margin: 18px 0 0; max-width: 34ch;
    font: var(--weight-regular) var(--text-md)/var(--leading-relaxed) var(--font-sans);
    color: rgba(255,255,255,0.82);
  }
  .auth-brand .brand-foot {
    font: var(--font-mono-sm);
    color: rgba(255,255,255,0.6);
  }

  /* ---------- 우측 폼 패널 ---------- */
  .auth-pane {
    display: grid; place-items: center;
    padding: 24px;
    background: var(--surface-app);
  }
  .auth-card {
    background: var(--surface-panel);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    padding: 36px 32px;
    width: 100%; max-width: 380px;
    display: flex; flex-direction: column; gap: 14px;
  }
  .auth-card h1 { margin: 0; font: var(--font-h1); letter-spacing: var(--tracking-tight); }
  .auth-card .sub { margin: -6px 0 6px; font-size: var(--text-sm); color: var(--text-muted); }
  .auth-card label {
    display: flex; flex-direction: column; gap: 6px;
    font: var(--font-label); color: var(--text-body);
  }
  .auth-card .primary { height: 42px; font-size: var(--text-base); border-radius: var(--radius-md); }
  .auth-card .error { color: var(--danger); margin: 0; font-size: var(--text-sm); }
  .auth-card .muted { color: var(--text-muted); font-size: var(--text-sm); margin: 4px 0 0; text-align: center; }
  .auth-card .back {
    display: inline-flex; align-items: center; justify-content: center;
    height: 42px; text-decoration: none; border-radius: var(--radius-md);
  }

  /* ---------- 반응형: 760px 미만에서 브랜드 패널 접기 ---------- */
  @media (max-width: 760px) {
    .auth-split { grid-template-columns: 1fr; }
    .auth-brand { display: none; }
    .auth-pane { padding: 16px; }
    .auth-card { padding: 28px 22px; box-shadow: var(--shadow-md); }
  }
`
