import { Link } from 'react-router';

/** 맨 위: 로고 + 고객/디자이너 전환 (Figma 홈 459:1022 · 521:1625 Nav) */
export function Header({ role = 'customer' }: { role?: 'customer' | 'designer' }) {
  return (
    <header className="header">
      <Link className="header__brand" to="/">
        IROKE
      </Link>
      <nav className="role-switch" aria-label="화면 전환">
        <Link to="/" aria-current={role === 'customer' ? 'page' : undefined}>
          고객
        </Link>
        <span aria-hidden="true">/</span>
        <Link to="/pro" aria-current={role === 'designer' ? 'page' : undefined}>
          디자이너
        </Link>
      </nav>
    </header>
  );
}
