// Application shell: hash routing between the overview, editor and viewer, the
// skip link, page titles and focus management, and one error boundary per view.
import { useEffect, useRef, useState } from 'react';
import { EditorPage } from './editor/EditorPage';
import { LandingPage } from './landing/LandingPage';
import { AppHeader } from './shared/AppHeader';
import { ErrorBoundary } from './shared/ErrorBoundary';
import { usePageHandler } from './shared/pageHandlers';
import { flushPendingSaves } from './shared/planStore';
import { parseRoute, ROUTE_TITLE, type Route } from './shared/route';
import { ViewerPage } from './viewer/ViewerPage';

/**
 * The root component. Routing is a hash (`#/editor`), so the static build works
 * from any host and any path without server rewrites.
 *
 * @remarks
 * Before switching views it flushes pending autosaves, because the next view
 * reads the plan from storage. Focus moves to `<main>` after navigation (not
 * on first load) so screen readers announce the new view.
 *
 * @see docs/reference/features.md (F-19, F-20, F-21)
 */
export function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  const main = useRef<HTMLElement>(null);
  const firstRoute = useRef(true);

  usePageHandler(window, 'onhashchange', () => {
    // Write any unsaved edit first: the next view reads the plan from storage.
    flushPendingSaves();
    setRoute(parseRoute(window.location.hash));
  });

  useEffect(() => {
    document.title = ROUTE_TITLE[route];
    // Announce the new view by moving focus to it, but leave focus alone on first load.
    if (firstRoute.current) firstRoute.current = false;
    else main.current?.focus();
  }, [route]);

  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          // A plain "#main" link would change the hash, which is the router.
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <AppHeader route={route} />
      <main ref={main} id="main" tabIndex={-1} aria-label={ROUTE_TITLE[route]}>
        <ErrorBoundary key={route}>
          {route === 'editor' && <EditorPage />}
          {route === 'viewer' && <ViewerPage />}
          {route === 'home' && <LandingPage />}
        </ErrorBoundary>
      </main>
    </>
  );
}
