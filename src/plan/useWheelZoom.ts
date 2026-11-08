// Wheel and trackpad handling for a plan SVG: Ctrl/⌘ + wheel zooms at the pointer, a plain wheel can pan.
import { useEffect, type RefObject } from 'react';
import { panBy, zoomAt, type Viewport } from '../core/viewport';

/** Pixels per wheel "line" when the browser reports scroll distance in lines (Firefox). */
const LINE_HEIGHT_PX = 16;
/** Pixels per wheel "page". */
const PAGE_HEIGHT_PX = 400;

interface WheelOptions {
  /** A plain wheel pans the plan. When false it is left to scroll the page. */
  readonly panWithWheel: boolean;
}

/**
 * Ctrl/⌘ + wheel (and trackpad pinch, which browsers report the same way) zooms
 * at the pointer.
 *
 * @remarks
 * React's `onWheel` goes through its delegated root handler, which is
 * registered as passive, so it cannot cancel the browser's own Ctrl+wheel page
 * zoom. A handler set directly on the SVG element is not passive and can. This
 * hook is the only code that sets that element's `onwheel`.
 *
 * @param svgRef - The SVG that receives wheel input; its `onwheel` is owned by this hook.
 * @param updateViewport - Applies a camera change.
 * @param options - `panWithWheel`: true in the editor, false in the viewer so the page scrolls.
 */
export function useWheelZoom(
  svgRef: RefObject<SVGSVGElement | null>,
  updateViewport: (update: (vp: Viewport) => Viewport) => void,
  { panWithWheel }: WheelOptions,
) {
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.onwheel = (wheel) => {
      const zooming = wheel.ctrlKey || wheel.metaKey;
      if (!zooming && !panWithWheel) return;
      wheel.preventDefault();
      const unit =
        wheel.deltaMode === 1 ? LINE_HEIGHT_PX : wheel.deltaMode === 2 ? PAGE_HEIGHT_PX : 1;
      if (zooming) {
        const rect = svg.getBoundingClientRect();
        const anchor = { x: wheel.clientX - rect.left, y: wheel.clientY - rect.top };
        updateViewport((vp) => zoomAt(vp, anchor, Math.exp(-wheel.deltaY * unit * 0.01)));
      } else {
        updateViewport((vp) => panBy(vp, -wheel.deltaX * unit, -wheel.deltaY * unit));
      }
    };
    return () => {
      svg.onwheel = null;
    };
  }, [svgRef, updateViewport, panWithWheel]);
}
