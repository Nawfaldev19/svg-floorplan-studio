// Element size hook used by the editor canvas and the viewer to size their SVG.
import { useLayoutEffect, useState, type RefObject } from 'react';
import type { Size } from '../core/viewport';

/**
 * Tracks an element's content-box size with a ResizeObserver.
 *
 * @returns `{ width: 0, height: 0 }` until the first observation.
 */
export function useElementSize(ref: RefObject<Element | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return size;
}
