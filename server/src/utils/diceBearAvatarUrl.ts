import crypto from "node:crypto";
import { createAvatar } from "@dicebear/core";
import { adventurer } from "@dicebear/collection";
import {
  extractSvgHexColors,
  injectSvgBackground,
  pickBackgroundHex,
  svgHasOpaqueBackground,
} from "./diceBearSvgBackground.js";
export function diceBearAvatarSvgUrl(seed: string): string {
  const s = seed.trim() || "user";
  const preview = createAvatar(adventurer, {
    seed: s,
    backgroundColor: ["transparent"],
    backgroundType: ["solid"],
  });
  const previewSvg = preview.toString();
  const bg = pickBackgroundHex(extractSvgHexColors(previewSvg), s);
  const avatar = createAvatar(adventurer, {
    seed: s,
    backgroundColor: [bg],
    backgroundType: ["solid"],
  });
  let svg = avatar.toString();
  if (!svgHasOpaqueBackground(svg)) {
    svg = injectSvgBackground(svg, bg);
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
export function newRandomDiceBearAvatarSvgUrl(): string {
  return diceBearAvatarSvgUrl(crypto.randomUUID());
}
