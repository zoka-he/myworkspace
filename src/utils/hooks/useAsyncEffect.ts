import { useEffect, useRef } from "react";

/** 清理函数：无 / 同步函数 / 返回 Promise 的异步函数 */
export type AsyncEffectCleanup = void | (() => void) | (() => Promise<void>);

/**
 * 异步版的 useEffect。
 * - 支持 deps 依赖。
 * - 支持清理函数：effect 可返回 void、() => void 或 () => Promise<void>。
 * - 连续触发时，前面未完成 effect 的 cleanup 会在其 resolve 时以 stale 分支执行，不会丢失；
 *   卸载时通过 cancelled 标记，确保 in-flight effect resolve 后也会执行自己的 cleanup。
 * - 若组件已 unmount 但 effect 的 await 才 resolve，cleanup 仍会执行；避免在 cleanup 里 setState，
 *   否则会触发 "state update on unmounted component" 警告。
 *
 * @example
 * // 无清理
 * useAsyncEffect(async () => { await fetch(...); }, [id]);
 *
 * @example
 * // 同步清理
 * useAsyncEffect(async () => {
 *   const sub = emitter.on('x', handler);
 *   return () => sub.off();
 * }, []);
 *
 * @example
 * // 异步清理
 * useAsyncEffect(async () => {
 *   const conn = await connect();
 *   return async () => { await conn.close(); };
 * }, []);
 */
export function useAsyncEffect(
  effect: () => Promise<void | AsyncEffectCleanup>,
  deps: React.DependencyList
): void {
  const cleanupRef = useRef<AsyncEffectCleanup | null>(null);
  const runIdRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    const runId = ++runIdRef.current;
    cancelledRef.current = false;
    cleanupRef.current = null;

    const run = async () => {
      try {
        const cleanup = await effect();

        // 注意闭包，如果await过程中deps变化，则runId会变化，导致stale为true，此时cleanup是在新effect后执行的
        const stale = runIdRef.current !== runId || cancelledRef.current;
        if (stale) {
          runCleanup(cleanup);
          return;
        }

        // 保存cleanup，用于清理时执行
        if (typeof cleanup === "function") {
          cleanupRef.current = cleanup;
        }
      } catch (err) {
        if (runIdRef.current === runId && !cancelledRef.current) {
          console.error("[useAsyncEffect]", err);
        }
      }
    };

    run();

    return () => {
      cancelledRef.current = true;
      const prev = cleanupRef.current;
      cleanupRef.current = null;

      // 清理时执行保存的cleanup
      runCleanup(prev);
    };
  }, deps);
}

function runCleanup(cleanup: AsyncEffectCleanup | null): void {
  if (typeof cleanup !== "function") return;
  let result: void | Promise<void>;
  try {
    result = cleanup();
  } catch (err) {
    console.error("[useAsyncEffect] cleanup error:", err);
    return;
  }
  if (result != null && typeof (result as Promise<unknown>).then === "function") {
    (result as Promise<void>).catch((err) =>
      console.error("[useAsyncEffect] cleanup error:", err)
    );
  }
}
