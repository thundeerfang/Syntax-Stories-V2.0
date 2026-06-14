export const LIGHTNING_AUTO_DISMISS_MS = 2400;
export const LIGHTNING_SIZE_PX = 300;
export const LIGHTNING_GAP_PX = 6;
export const LIGHTNING_LOTTIE_SRC = "/lottie/lightning.lottie";
export const LIGHTNING_LAYER_Z_INDEX = 200;
export type LightningAnchorRect = Readonly<{
  top: number;
  left: number;
  width: number;
  height: number;
}>;
export function lightningOverlayBox(anchor: LightningAnchorRect): Readonly<{
  left: number;
  top: number;
  width: number;
  height: number;
}> {
  const centerX = anchor.left + anchor.width / 2;
  return {
    left: centerX - LIGHTNING_SIZE_PX / 2,
    top: anchor.top - LIGHTNING_SIZE_PX - LIGHTNING_GAP_PX,
    width: LIGHTNING_SIZE_PX,
    height: LIGHTNING_SIZE_PX,
  };
}
