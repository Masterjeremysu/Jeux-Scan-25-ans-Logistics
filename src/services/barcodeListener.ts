// Global Barcode Scanner Listener for Hardware Douchettes (USB/Bluetooth/Zebra HID)

type BarcodeScanCallback = (barcode: string) => void;

class BarcodeListener {
  private buffer: string = '';
  private lastKeyTime: number = 0;
  private readonly maxIntervalMs: number = 65; // Max delay between characters for barcode scanner
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
    const cleaned = barcode.trim();
    if (!cleaned) return;
    this.listeners.forEach((cb) => cb(cleaned));
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Ignore function keys, escape, tabs
    if (e.key === 'Escape' || e.key === 'Tab') return;

    // Do not interfere if user is typing in a standard form input (unless it's barcode input)
    const target = e.target as HTMLElement;
    const isStandardTextInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastKeyTime;
    this.lastKeyTime = currentTime;

    // If Enter key is pressed, finish buffer
    if (e.key === 'Enter') {
      if (this.buffer.length >= 3) {
        // Barcode detected!
        const scannedCode = this.buffer.trim();
        this.buffer = '';
        if (!isStandardTextInput) {
          e.preventDefault();
        }
        this.listeners.forEach((cb) => cb(scannedCode));
        return;
      }
      this.buffer = '';
      return;
    }

    // Single readable character (ignore Shift, Control, Alt, etc.)
    if (e.key.length === 1) {
      if (timeDiff > this.maxIntervalMs && this.buffer.length > 0) {
        // Human typing or long pause: reset buffer
        this.buffer = '';
      }
      this.buffer += e.key;
    }
  }
}

export const barcodeListener = new BarcodeListener();
