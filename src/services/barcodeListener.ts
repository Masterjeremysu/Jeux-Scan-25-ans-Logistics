// Global Barcode Scanner Listener for Hardware Douchettes (USB/Bluetooth/Zebra HID/DataWedge)

type BarcodeScanCallback = (barcode: string) => void;

class BarcodeListener {
  private buffer: string = '';
  private lastKeyTime: number = 0;
  private keyTimes: number[] = [];
  private readonly maxIntervalMs: number = 180; // Extended to support Android DataWedge keystroke delays
  private autoSubmitTimer: any = null;
  private listeners: Set<BarcodeScanCallback> = new Set();
  private active: boolean = false;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  public start() {
    if (this.active || typeof window === 'undefined') return;
    this.active = true;
    window.addEventListener('keydown', this.handleKeyDown, true);
  }

  public stop() {
    if (!this.active || typeof window === 'undefined') return;
    this.active = false;
    window.removeEventListener('keydown', this.handleKeyDown, true);
    this.buffer = '';
    this.clearAutoSubmitTimer();
  }

  public subscribe(callback: BarcodeScanCallback): () => void {
    this.listeners.add(callback);
    if (!this.active) {
      this.start();
    }
    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.stop();
      }
    };
  }

  public simulateScan(barcode: string) {
    const cleaned = barcode.trim().toUpperCase();
    if (!cleaned) return;
    this.listeners.forEach((cb) => cb(cleaned));
  }

  /**
   * Direct input injection from hidden Zebra input field or camera scanner
   */
  public handleDirectInput(rawText: string) {
    const cleaned = rawText.replace(/[\r\n\t]/g, '').trim().toUpperCase();
    if (cleaned.length >= 3) {
      this.simulateScan(cleaned);
    }
  }

  private clearAutoSubmitTimer() {
    if (this.autoSubmitTimer) {
      clearTimeout(this.autoSubmitTimer);
      this.autoSubmitTimer = null;
    }
  }

  private submitCurrentBuffer() {
    this.clearAutoSubmitTimer();
    const scannedCode = this.buffer.replace(/[\r\n\t]/g, '').trim().toUpperCase();
    this.buffer = '';
    this.keyTimes = [];
    if (scannedCode.length >= 3) {
      this.listeners.forEach((cb) => cb(scannedCode));
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Ignore function keys, escape
    if (e.key === 'Escape') return;

    // Do not interfere if user is typing in a standard visible form input
    const target = e.target as HTMLElement;
    const isStandardTextInput = target && 
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && 
      !target.classList.contains('zebra-barcode-catcher');

    if (isStandardTextInput) return;

    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastKeyTime;
    this.lastKeyTime = currentTime;

    // If Enter or Tab key is pressed, finish buffer immediately
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (this.buffer.length >= 3) {
        e.preventDefault();
        this.submitCurrentBuffer();
        return;
      }
      this.buffer = '';
      this.keyTimes = [];
      return;
    }

    // Single readable character (letters, numbers, underscores, dashes, etc.)
    if (e.key.length === 1) {
      if (timeDiff > this.maxIntervalMs && this.buffer.length > 0) {
        // Long pause: human typing or reset
        this.buffer = '';
        this.keyTimes = [];
      }

      this.buffer += e.key;
      this.keyTimes.push(timeDiff);

      // Auto-debounce submit:
      // If Zebra DataWedge does not send Enter or Tab, but rapid burst of chars ended
      this.clearAutoSubmitTimer();
      if (this.buffer.length >= 4) {
        // If average interval is fast (< 120ms), it's a barcode scanner
        const avgInterval = this.keyTimes.reduce((a, b) => a + b, 0) / this.keyTimes.length;
        if (avgInterval < 130) {
          this.autoSubmitTimer = setTimeout(() => {
            this.submitCurrentBuffer();
          }, 140);
        }
      }
    }
  }
}

export const barcodeListener = new BarcodeListener();
