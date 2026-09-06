/** 可重置的延时闸门：进入区 cancel()、离开区 schedule()，到点执行一次 onClose */
export class CloseGate {
  private timer: number | null = null;
  private readonly delayMs: number;
  private readonly onClose: () => void;

  constructor(delayMs: number, onClose: () => void) {
    this.delayMs = delayMs;
    this.onClose = onClose;
  }

  schedule(): void {
    this.cancel();
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.onClose();
    }, this.delayMs);
  }

  cancel(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
