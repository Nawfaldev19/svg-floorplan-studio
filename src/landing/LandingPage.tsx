// The overview page: what the demo does, links into both views, and the shortcut list.
import { Accessibility, ArrowRight, Eye, Gauge, Layers, PenTool } from 'lucide-react';
import { useId } from 'react';
import { ROUTE_HREF } from '../shared/route';
import { ShortcutList } from '../shared/ShortcutList';
import styles from './LandingPage.module.css';

const POINTS = [
  {
    icon: PenTool,
    title: 'A real editor',
    body: 'Select, marquee, move with snapping, resize and rotate with handles, align and distribute, copy and paste, group, and paint amenity tags with a brush.',
  },
  {
    icon: Layers,
    title: 'Undo that scales',
    body: 'History stores small invertible operations, not snapshots. A whole drag is one step, and long sessions stay light.',
  },
  {
    icon: Accessibility,
    title: 'Keyboard first',
    body: 'An outline listbox with multi-select, numeric fields, shortcuts and announcements that say where things ended up. Press ? in the editor for every shortcut.',
  },
  {
    icon: Gauge,
    title: 'Large plans',
    body: 'Only items inside the viewport are drawn. Load the 3,000-desk stress floor from the editor to see it.',
  },
] as const;

/** The overview page shown at `#/`. Its shortcut list is generated from `KEYMAP`. */
export function LandingPage() {
  const shortcutsId = useId();
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Larkspur Commons · co-working floor</p>
        <h1 className={styles.title}>Lay out a floor. Share it read-only.</h1>
        <p className={styles.lede}>
          Floorplan Studio is a browser-based floor-plan editor for a co-working space, with an
          embeddable viewer that lets members find a standing desk or a quiet spot. Everything runs
          locally; your plan is saved in this browser.
        </p>
        <div className={styles.actions}>
          <a className={styles.primary} href={ROUTE_HREF.editor}>
            Open the editor <ArrowRight size={18} aria-hidden="true" />
          </a>
          <a className={styles.secondary} href={ROUTE_HREF.viewer}>
            <Eye size={18} aria-hidden="true" /> Open the viewer
          </a>
        </div>
      </div>

      <ul className={styles.points} aria-label="What this demo shows">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <li key={title} className={styles.point}>
            <Icon className={styles.pointIcon} size={22} aria-hidden="true" />
            <h2 className={styles.pointTitle}>{title}</h2>
            <p>{body}</p>
          </li>
        ))}
      </ul>

      <div className={styles.shortcuts} role="region" aria-labelledby={shortcutsId}>
        <h2 id={shortcutsId} className={styles.shortcutsTitle}>
          Editor shortcuts
        </h2>
        <ShortcutList headingLevel="h3" />
      </div>
    </div>
  );
}
