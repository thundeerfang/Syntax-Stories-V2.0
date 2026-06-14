import sharp from "sharp";
const BLUR_EDGE = 12;
export async function jpegBlurDataUrlFromFile(
  imagePath: string,
): Promise<string> {
  const buf = await sharp(imagePath)
    .rotate()
    .resize(BLUR_EDGE, BLUR_EDGE, { fit: "inside" })
    .jpeg({ quality: 22, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}
