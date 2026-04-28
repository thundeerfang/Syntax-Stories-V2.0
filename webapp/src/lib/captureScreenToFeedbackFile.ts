import { FEEDBACK_MAX_IMAGE_BYTES } from '@/api/feedback';

const MAX_CAPTURE_EDGE = 1920;

/**
 * One-frame screen capture via `getDisplayMedia` (Chrome / Chromium / Edge).
 * Produces a JPEG `File` for the same feedback pipeline as uploads.
 */
export async function captureScreenToFeedbackFile(): Promise<File> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen capture is not supported in this browser. Try Chrome or Edge, or use Upload instead.');
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  });

  const track = stream.getVideoTracks()[0];
  const video = document.createElement('video');
  video.playsInline = true;
  video.muted = true;
  video.srcObject = stream;

  try {
    await video.play();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) {
      throw new Error('Could not read capture dimensions.');
    }

    let cw = vw;
    let ch = vh;
    if (vw > MAX_CAPTURE_EDGE || vh > MAX_CAPTURE_EDGE) {
      const scale = MAX_CAPTURE_EDGE / Math.max(vw, vh);
      cw = Math.max(1, Math.round(vw * scale));
      ch = Math.max(1, Math.round(vh * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available.');

    ctx.drawImage(video, 0, 0, cw, ch);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not encode capture.'))),
        'image/jpeg',
        0.88
      );
    });

    if (blob.size > FEEDBACK_MAX_IMAGE_BYTES) {
      throw new Error(
        `Capture is too large (max ${Math.round(FEEDBACK_MAX_IMAGE_BYTES / (1024 * 1024))} MB). Try sharing a smaller window or use Upload with a cropped image.`
      );
    }

    const name = `screen-capture-${Date.now()}.jpg`;
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  }
}
