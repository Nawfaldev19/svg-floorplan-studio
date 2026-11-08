// Per-view error boundary with a recovery message and a reload button.
import { Component, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  /** The view to protect. */
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  /** Set once a descendant has thrown while rendering. */
  readonly failed: boolean;
}

/**
 * Last line of defence: an unexpected error shows a recovery message instead of
 * a blank page. The plan in storage is untouched, because autosave only ever
 * writes plans that passed validation.
 *
 * @remarks
 * The message is fixed text: the error itself is not shown, so no internal
 * detail reaches the page. `App` keys the boundary by route, so navigating to
 * another view resets it.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className={styles.panel} role="alert">
        <h1 className={styles.title}>Something went wrong</h1>
        <p>
          The page hit an unexpected error. Your last saved plan is still in this browser; reload to
          continue from it.
        </p>
        <button
          type="button"
          className={styles.reload}
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
