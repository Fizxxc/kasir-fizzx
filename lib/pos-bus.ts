export type DisplayItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  lineTotal: number;
};

export type DisplayState = {
  items: DisplayItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;

  paymentMethod?: "cash" | "qris" | "debit";
  paid?: number;
  change?: number;

  // QRIS
  qrisPayload?: string;
  qrisDataUrl?: string;
};

const CHANNEL = "pos_display";

export function createPosBus() {
  const bc = new BroadcastChannel(CHANNEL);
  return {
    send(state: DisplayState) {
      bc.postMessage(state);
    },
    on(fn: (state: DisplayState) => void) {
      bc.onmessage = (ev) => fn(ev.data as DisplayState);
      return () => bc.close();
    },
    close() {
      bc.close();
    },
  };
}