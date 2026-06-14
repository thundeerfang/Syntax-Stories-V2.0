"use client";
import type { AchievementUnlockStreamEvent } from "@/contracts/achievementsApi";
export async function consumeAchievementStream(
  url: string,
  accessToken: string,
  onEvent: (event: AchievementUnlockStreamEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "text/event-stream",
    },
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`Achievement stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const lines = part.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          onEvent(JSON.parse(raw) as AchievementUnlockStreamEvent);
        } catch {}
      }
    }
  }
}
