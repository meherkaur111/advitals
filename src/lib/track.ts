/** Fire a Clarity custom event if Clarity is loaded. Never throws. */
export function track(event: string) {
  try {
    const w = window as unknown as { clarity?: (cmd: string, name: string) => void };
    w.clarity?.("event", event);
  } catch {
    /* analytics must never break the app */
  }
}
