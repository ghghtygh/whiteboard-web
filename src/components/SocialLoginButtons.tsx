import { OAUTH_PROVIDERS, SOCIAL_LOGIN_ENABLED, oauthLoginUrl } from '@/api/oauth'

export function SocialLoginButtons() {
  if (!SOCIAL_LOGIN_ENABLED) return null

  return (
    <div className="social-login">
      <div className="divider">
        <span>또는</span>
      </div>
      <div className="social-buttons">
        {OAUTH_PROVIDERS.map((p) => (
          <a
            key={p.id}
            className="social-btn"
            href={oauthLoginUrl(p.id)}
            style={{ background: p.bg, color: p.fg, border: `1px solid ${p.border ?? p.bg}` }}
          >
            {p.label} 계정으로 계속
          </a>
        ))}
      </div>
      <style>{`
        .social-login { display: flex; flex-direction: column; gap: 12px; }
        .divider {
          display: flex; align-items: center; gap: 12px;
          color: var(--color-muted); font-size: 12px;
        }
        .divider::before, .divider::after {
          content: ''; flex: 1; height: 1px; background: var(--color-border);
        }
        .social-buttons { display: flex; flex-direction: column; gap: 8px; }
        .social-btn {
          display: flex; align-items: center; justify-content: center;
          height: 40px; border-radius: var(--radius-md);
          font-size: 14px; font-weight: 600; text-decoration: none;
          transition: filter 0.15s ease, box-shadow 0.15s ease;
        }
        .social-btn:hover { filter: brightness(0.97); box-shadow: var(--shadow-sm); }
        .social-btn:active { filter: brightness(0.93); }
      `}</style>
    </div>
  )
}
