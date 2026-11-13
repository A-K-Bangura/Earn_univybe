import { NavLink } from 'react-router-dom';
import { Compass, BriefcaseBusiness, MessageSquare, Sparkles, User, Sun, Moon } from 'lucide-react';
import { isAuthenticated } from '../../services/auth';
import { useUIStore } from '../../store/uiStore';
import { brandWordBlack, brandWordWhite } from '../../assets/brand';
import './EarnNavigation.css';

const destinations = [
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/opportunities', label: 'Opportunities', icon: Sparkles },
  { to: '/gigs', label: 'Gigs', icon: BriefcaseBusiness },
  { to: '/feed', label: 'Feed', icon: MessageSquare },
  { to: '/profile', label: 'Profile', icon: User },
];

export function EarnNavigation({ mobile = false }: { mobile?: boolean }) {
  const { darkMode, toggleDarkMode } = useUIStore();
  const logo = darkMode ? brandWordWhite : brandWordBlack;
  const links = destinations.map(({ to, label, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      end={to === '/discover'}
      className={({ isActive }) => `earn-navigation-link${isActive ? ' is-active' : ''}`}
    >
      <Icon aria-hidden="true" className="earn-navigation-icon" strokeWidth={1.8}/>
      <span>{label}</span>
    </NavLink>
  ));

  if (mobile) {
    return <nav aria-label="Mobile navigation" className="own-links earn-mobile-navigation">{links}</nav>;
  }

  return (
    <nav aria-label="Main navigation" className="own-links earn-navigation">
      <div className="earn-navigation-inner">
        <NavLink to={isAuthenticated() ? '/discover' : '/'} aria-label="UniVybe Earn home" className="earn-navigation-brand">
          <img src={logo.src} width={logo.width} height={logo.height} alt="UniVybe" className="earn-navigation-logo"/>
          <span className="earn-navigation-brand-divider" aria-hidden="true"/>
          <span className="earn-navigation-badge">Earn</span>
        </NavLink>
        <div className="earn-navigation-destinations">{links}</div>
        <button type="button" className="earn-navigation-theme" onClick={toggleDarkMode} aria-label="Toggle dark mode" aria-pressed={darkMode} title={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}>
          {darkMode ? <Sun aria-hidden="true" size={19}/> : <Moon aria-hidden="true" size={19}/>}
        </button>
      </div>
    </nav>
  );
}
