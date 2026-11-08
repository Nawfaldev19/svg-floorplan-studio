// Align, distribute and rotate-by controls for the current selection.
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  RotateCcw,
  RotateCw,
  type LucideIcon,
} from 'lucide-react';
import { useId, type Dispatch } from 'react';
import type { AlignEdge } from '../core/arrange';
import type { EditorAction } from '../core/editor';
import { Button } from '../shared/Button';
import styles from './Inspector.module.css';

type ArrangeTool = {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly action: EditorAction;
  /** Fewest selected items the tool needs. */
  readonly needs: number;
};

const align = (edge: AlignEdge, label: string, icon: LucideIcon): ArrangeTool => ({
  label,
  icon,
  action: { type: 'align', edge },
  needs: 2,
});

/** One line per axis: three alignments then the distribution along that axis. */
const LINES: readonly (readonly ArrangeTool[])[] = [
  [
    align('left', 'Align left edges', AlignStartVertical),
    align('centerX', 'Align centres', AlignCenterVertical),
    align('right', 'Align right edges', AlignEndVertical),
    {
      label: 'Distribute horizontally',
      icon: AlignHorizontalDistributeCenter,
      action: { type: 'distribute', axis: 'horizontal' },
      needs: 3,
    },
  ],
  [
    align('top', 'Align top edges', AlignStartHorizontal),
    align('centerY', 'Align middles', AlignCenterHorizontal),
    align('bottom', 'Align bottom edges', AlignEndHorizontal),
    {
      label: 'Distribute vertically',
      icon: AlignVerticalDistributeCenter,
      action: { type: 'distribute', axis: 'vertical' },
      needs: 3,
    },
  ],
];

function IconAction({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      icon={<Icon size={18} aria-hidden="true" />}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    />
  );
}

/**
 * Align, distribute and rotate controls for the current selection. A
 * multi-selection rotates as one shape about its centre.
 *
 * @param props - `count`: how many items are selected (align needs two,
 *   distribute three); `dispatch`: editor dispatch.
 */
export function ArrangePanel({
  count,
  dispatch,
}: {
  count: number;
  dispatch: Dispatch<EditorAction>;
}) {
  const headingId = useId();
  return (
    <div className={styles.arrange} role="group" aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.subheading}>
        Arrange
      </h3>
      {count > 1 && (
        <div className={styles.iconActions}>
          {LINES.flat().map((tool) => (
            <IconAction
              key={tool.label}
              label={tool.label}
              icon={tool.icon}
              disabled={count < tool.needs}
              onClick={() => {
                dispatch(tool.action);
              }}
            />
          ))}
        </div>
      )}
      <div className={styles.iconActions}>
        <IconAction
          label="Rotate 15° anticlockwise ([)"
          icon={RotateCcw}
          onClick={() => {
            dispatch({ type: 'rotateBy', degrees: -15 });
          }}
        />
        <IconAction
          label="Rotate 15° clockwise (])"
          icon={RotateCw}
          onClick={() => {
            dispatch({ type: 'rotateBy', degrees: 15 });
          }}
        />
      </div>
    </div>
  );
}
