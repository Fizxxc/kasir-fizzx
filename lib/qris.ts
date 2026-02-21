// EMVCo TLV helpers + CRC16-CCITT (0x1021)
function crc16ccitt(str: string) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

type TLV = { id: string; value: string };

function parseTLV(payload: string): TLV[] {
  const out: TLV[] = [];
  let i = 0;
  while (i < payload.length) {
    const id = payload.slice(i, i + 2);
    const len = parseInt(payload.slice(i + 2, i + 4), 10);
    const value = payload.slice(i + 4, i + 4 + len);
    out.push({ id, value });
    i = i + 4 + len;
  }
  return out;
}

function buildTLV(items: TLV[]) {
  return items
    .map(({ id, value }) => id + String(value.length).padStart(2, "0") + value)
    .join("");
}

/**
 * Convert QRIS static -> dynamic by setting amount (tag 54) and recalculating CRC (tag 63).
 * - Removes existing 54 (if any)
 * - Rebuilds payload without 63, then append "6304" + CRC
 */
export function makeDynamicQris(baseQris: string, amount: number) {
  const clean = baseQris.trim();

  // remove CRC part if present (63xx....)
  // safer: parse TLV and rebuild
  const tlv = parseTLV(clean);

  // drop tag 54 & 63
  const filtered = tlv.filter((x) => x.id !== "54" && x.id !== "63");

  // insert amount tag 54 before 63 (we'll append 63 later)
  const amt = amount.toFixed(2); // QRIS expects decimal, ex: "12000.00"
  filtered.push({ id: "54", value: amt });

  // Build without CRC
  const body = buildTLV(filtered);

  // append 6304 then CRC over body+"6304"
  const crcInput = body + "6304";
  const crc = crc16ccitt(crcInput);

  return crcInput + crc;
}