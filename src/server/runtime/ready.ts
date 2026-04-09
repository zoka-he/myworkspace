import { runtimeConfigCenter } from './config-center';

let started = false;
let initPromise: Promise<void> | null = null;

export function bootstrapRuntime() {
  if (!initPromise) {
    initPromise = (async () => {
      const nacosEnabled = process.env.NACOS_ENABLE_CLIENT === 'true';
      if (!nacosEnabled) {
        started = true;
        return;
      }

      await runtimeConfigCenter.init();
      started = true;
    })().catch((error) => {
      initPromise = null;
      started = false;
      throw error;
    });
  }
  return initPromise;
}

export function isRuntimeReady() {
  return started;
}

export async function ensureRuntimeReady(timeoutMs = 5000) {
  if (started) return;
  const p = bootstrapRuntime();
  await Promise.race([
    p,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('runtime initialization timeout')), timeoutMs)
    ),
  ]);
}
