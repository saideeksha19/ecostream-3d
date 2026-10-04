/** OrbitControls measures speed in revolutions per minute. */
export const AUTO_ROTATE_SPEED = 60 / 55;
export const IDLE_RESUME_MS = 3000;

export interface RotationOptions {
  active: boolean;
  autoRotate: boolean;
  reducedMotion: boolean;
}

/** A clock-independent interaction gate. Camera changes/damping are not user input. */
export class IdleRotation {
  private held = new Set<string>();
  private resumeAt = 0;

  begin(source: string, now: number): void {
    this.held.add(source);
    this.resumeAt = now + IDLE_RESUME_MS;
  }

  end(source: string, now: number): void {
    if (this.held.delete(source)) this.resumeAt = now + IDLE_RESUME_MS;
  }

  releaseAll(now: number): void {
    if (this.held.size) this.resumeAt = now + IDLE_RESUME_MS;
    this.held.clear();
  }

  /** null: suspended/held; positive: one wake-up timer; zero: rotate. */
  delay(options: RotationOptions, now: number): number | null {
    if (!options.active || !options.autoRotate || options.reducedMotion || this.held.size) return null;
    return Math.max(0, this.resumeAt - now);
  }
}
