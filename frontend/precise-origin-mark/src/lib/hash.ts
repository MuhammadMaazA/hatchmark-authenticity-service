export async function sha256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toGrayscale(r: number, g: number, b: number) {
  // Luma ITU-R BT.709
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export async function aHash(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const size = 8; // 8x8 aHash
  canvas.width = size;
  canvas.height = size;
  ctx.drawImage(bmp, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const grays: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    grays.push(toGrayscale(data[i], data[i + 1], data[i + 2]));
  }
  const avg = grays.reduce((a, b) => a + b, 0) / grays.length;

  // Build 64-bit binary string
  let bits = "";
  for (const g of grays) bits += g >= avg ? "1" : "0";

  // Convert to hex string (16 hex chars)
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    const chunk = bits.slice(i, i + 4);
    hex += parseInt(chunk, 2).toString(16);
  }
  return hex.padStart(16, "0");
}

export function hammingDistance(hexA: string, hexB: string): number {
  const a = BigInt("0x" + hexA);
  const b = BigInt("0x" + hexB);
  let x = a ^ b;
  let count = 0;
  while (x) {
    x &= x - 1n; // clear lowest set bit
    count++;
  }
  return count;
}
