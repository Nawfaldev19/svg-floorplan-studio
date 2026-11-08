// The member-facing viewer page: hosts PlanViewer with the saved plan and shows item details.
import { useId, useState } from 'react';
import { AMENITY_SPECS, KIND_SPECS } from '../core/catalog';
import type { AmenityTag, PlanItem } from '../core/types';
import { Swatch } from '../plan/Swatch';
import { browserStore, loadInitialPlan } from '../shared/planStore';
import { ROUTE_HREF } from '../shared/route';
import { PlanViewer } from './PlanViewer';
import styles from './ViewerPage.module.css';

function ItemDetails({ item }: { item: PlanItem | null }) {
  if (!item) {
    return (
      <p className={styles.placeholder}>
        Select an item on the plan, or Tab to the plan, move with the arrow keys and press Enter, to
        see its details here.
      </p>
    );
  }
  return (
    <dl className={styles.details}>
      <dt>Name</dt>
      <dd>{item.name}</dd>
      <dt>Type</dt>
      <dd>{KIND_SPECS[item.kind].label}</dd>
      <dt>Size</dt>
      <dd className={styles.mono}>
        {Math.round(item.width)} × {Math.round(item.height)} cm
      </dd>
      <dt>Amenities</dt>
      <dd>
        {item.tags.length === 0 ? (
          'None listed'
        ) : (
          <ul className={styles.tagList}>
            {item.tags.map((tag) => (
              <li key={tag}>
                <Swatch tag={tag} />
                {AMENITY_SPECS[tag].label}
              </li>
            ))}
          </ul>
        )}
      </dd>
    </dl>
  );
}

/**
 * Member-facing page: the saved plan (or the demo plan) shown read-only.
 *
 * @remarks
 * Reads storage once on mount through the same validated loader as the editor.
 * Details are in a polite live region, so picking an item announces it.
 */
export function ViewerPage() {
  const [{ doc: plan, notice }] = useState(() => loadInitialPlan(browserStore()));
  const [highlight, setHighlight] = useState<AmenityTag | null>(null);
  const [selected, setSelected] = useState<PlanItem | null>(null);
  const detailsId = useId();

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <h1 className={styles.title}>{plan.title}</h1>
        {notice && <p className={styles.notice}>{notice}</p>}
        <PlanViewer
          plan={plan}
          highlight={highlight}
          onHighlightChange={setHighlight}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
      </div>
      <aside className={styles.side} aria-labelledby={detailsId}>
        <h2 id={detailsId} className={styles.sideTitle}>
          Details
        </h2>
        <div aria-live="polite">
          <ItemDetails item={selected} />
        </div>
        <p className={styles.hint}>
          This view shows the plan saved by the <a href={ROUTE_HREF.editor}>editor</a> in this
          browser. It is read-only.
        </p>
      </aside>
    </div>
  );
}
