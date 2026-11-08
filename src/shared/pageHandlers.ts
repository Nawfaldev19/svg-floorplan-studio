// The one owner of every `window.on…` and `document.on…` handler in the app. A
// property handler holds one function, so callers subscribe here instead of
// assigning it, and nothing can overwrite another subscriber.
import { useEffect, useRef } from 'react';

type Target = Window | Document;

/** The `on…` handler properties of a target, such as `onblur` or `onkeydown`. */
type HandlerKey<T extends Target> = {
  [K in keyof T]-?: K extends `on${string}` ? K : never;
}[keyof T];

/** What the browser passes to the handler stored under `key`. */
type HandlerArg<T extends Target, K extends HandlerKey<T>> = T[K] extends
  ((this: never, arg: infer A) => unknown) | null
  ? A
  : never;

type Subscriber = (arg: unknown) => void;

const slots = new WeakMap<Target, Map<PropertyKey, Set<Subscriber>>>();

/**
 * Calls `fn` whenever the browser runs the `key` handler of `target`, for
 * example `subscribe(window, 'onblur', reset)`.
 *
 * @remarks
 * The first subscriber for a target and key installs one property handler
 * that calls every subscriber in order; the last one to leave sets it back to
 * null. `tests/unit/page-handlers.test.ts` fails if any other module assigns
 * a `window` or `document` handler property.
 *
 * @returns A function that removes the subscription.
 */
export function subscribe<T extends Target, K extends HandlerKey<T>>(
  target: T,
  key: K,
  fn: (arg: HandlerArg<T, K>) => void,
): () => void {
  let byKey = slots.get(target);
  if (!byKey) {
    byKey = new Map();
    slots.set(target, byKey);
  }
  let subscribers = byKey.get(key);
  if (!subscribers) {
    const set = new Set<Subscriber>();
    subscribers = set;
    byKey.set(key, set);
    (target as unknown as Record<PropertyKey, unknown>)[key] = (arg: unknown) => {
      for (const subscriber of [...set]) subscriber(arg);
    };
  }
  const own = fn as Subscriber;
  subscribers.add(own);
  const set = subscribers;
  const keys = byKey;
  return () => {
    set.delete(own);
    if (set.size === 0 && keys.get(key) === set) {
      keys.delete(key);
      (target as unknown as Record<PropertyKey, unknown>)[key] = null;
    }
  };
}

/**
 * {@link subscribe} for the lifetime of a component. The latest `fn` is always
 * called, so it may close over fresh state without resubscribing.
 *
 * @param enabled - When false, nothing is subscribed (a menu that is closed, say).
 */
export function usePageHandler<T extends Target, K extends HandlerKey<T>>(
  target: T,
  key: K,
  fn: (arg: HandlerArg<T, K>) => void,
  enabled = true,
): void {
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  useEffect(() => {
    if (!enabled) return;
    return subscribe(target, key, (arg) => {
      latest.current(arg);
    });
  }, [target, key, enabled]);
}
