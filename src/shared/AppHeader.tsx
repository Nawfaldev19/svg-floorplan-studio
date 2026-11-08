// Site header: brand link, primary navigation with aria-current, and the theme toggle.
import { Monitor, Moon, Sun } from 'lucide-react';
import { ROUTE_HREF, type Route } from './route';
import styles from './AppHeader.module.css';
import { useTheme } from './useTheme';

const LINKS: readonly { route: Route; label: string }[] = [
  { route: 'home', label: 'Overview' },
  { route: 'editor', label: 'Editor' },
  { route: 'viewer', label: 'Viewer' },
];

const THEME_LABEL = { system: 'System theme', light: 'Light theme', dark: 'Dark theme' } as const;

/**
 * The header shown on every view.
 *
 * @param props - `route`: the current view, marked with `aria-current="page"`.
 */
export function AppHeader({ route }: { route: Route }) {
  const { choice, cycle } = useTheme();
  const ThemeIcon = choice === 'dark' ? Moon : choice === 'light' ? Sun : Monitor;

  return (
    <header className={styles.header}>
      <a className={styles.brand} href={ROUTE_HREF.home}>
        <svg className={styles.mark} viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="7" />
          <path d="M8 9h16v14H8zM16 9v6M8 17h6" />
          <circle cx="21" cy="19" r="2.5" />
        </svg>
        <span className={styles.brandName}>Floorplan Studio</span>
      </a>
      <nav aria-label="Primary">
        <ul className={styles.links}>
          {LINKS.map((link) => (
            <li key={link.route}>
              <a
                className={styles.link}
                href={ROUTE_HREF[link.route]}
                aria-current={route === link.route ? 'page' : undefined}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <button
        type="button"
        className={styles.theme}
        onClick={cycle}
        aria-label={`${THEME_LABEL[choice]}. Switch theme`}
        title={THEME_LABEL[choice]}
      >
        <ThemeIcon size={18} aria-hidden="true" />
      </button>
    </header>
  );
}
