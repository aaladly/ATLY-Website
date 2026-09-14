"use client";

import { useSyncExternalStore } from "react";

/**
 * False while rendering on the server and during hydration, true afterwards.
 *
 * The obvious version of this is `useState(false)` plus `useEffect(() =>
 * setMounted(true))`, which is a cascading render and a lint error. This is
 * the same answer without either: a store that never changes, whose server
 * snapshot is false and whose client snapshot is true.
 *
 * Used by anything that must not render until the browser can be asked a
 * question the server cannot answer — what is in a cookie, what is in
 * localStorage.
 */

const noopSubscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

export const useHydrated = (): boolean =>
  useSyncExternalStore(noopSubscribe, onClient, onServer);
