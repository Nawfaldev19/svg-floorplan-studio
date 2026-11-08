// The three views and their hash URLs and page titles.

/** The app's views. */
export type Route = 'home' | 'editor' | 'viewer';

/** Link target for each view. */
export const ROUTE_HREF: Readonly<Record<Route, string>> = {
  home: '#/',
  editor: '#/editor',
  viewer: '#/viewer',
};

/** Document title per view, so the browser tab and screen readers name the page. */
export const ROUTE_TITLE: Readonly<Record<Route, string>> = {
  home: 'Floorplan Studio',
  editor: 'Editor · Floorplan Studio',
  viewer: 'Viewer · Floorplan Studio',
};

/** Maps `location.hash` to a view; anything unknown shows the overview. */
export function parseRoute(hash: string): Route {
  if (hash.startsWith('#/editor')) return 'editor';
  if (hash.startsWith('#/viewer')) return 'viewer';
  return 'home';
}
