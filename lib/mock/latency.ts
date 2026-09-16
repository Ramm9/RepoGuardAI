import { MOCK_LATENCY } from "@/lib/api/config";

/**
 * Simulated network latency for the mock service layer.
 *
 * Mock data that resolves instantly hides every loading state in the product,
 * which is exactly the part most likely to be wrong when the real Django API is
 * wired up. Delaying the mock keeps skeletons, spinners, and disabled submit
 * buttons on screen long enough to actually be designed.
 *
 * The jitter is derived from the requested duration rather than Math.random(),
 * so repeated calls stay deterministic and nothing differs between renders.
 */
export function mockDelay(ms: number = MOCK_LATENCY): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });
}
