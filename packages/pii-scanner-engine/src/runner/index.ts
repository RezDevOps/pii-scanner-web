/**
 * Re-exports publics de la couche `Runner`.
 */
export type { Runner, ScanJob } from "./types.js";
export { detectorIds } from "./types.js";
export {
  MainThreadRunner,
  createMainThreadRunner,
  resolveDetectors,
} from "./main-thread-runner.js";
export {
  WorkerPoolRunner,
  createWorkerPoolRunner,
} from "./worker-pool-runner.js";
export type {
  WorkerFactory,
  WorkerLike,
  WorkerPoolRunnerOptions,
} from "./worker-pool-runner.js";
