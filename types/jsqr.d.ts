declare module "jsqr" {
  interface QRCode {
    data: string;
  }

  interface JSQRInputOptions {
    inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst";
  }

  function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: JSQRInputOptions,
  ): QRCode | null;

  export default jsQR;
}
