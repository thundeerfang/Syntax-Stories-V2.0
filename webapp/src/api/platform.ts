import { resolvePublicApiBase } from "@/lib/api/publicApiBase";
import type { PublicPlatformStatsDto } from "@/contracts/platformApi";
const base = () => resolvePublicApiBase();
export type {
  PublicPlatformStatsDto,
  PublicPlatformStatsResponse,
} from "@/contracts/platformApi";
export async function fetchPlatformStats(): Promise<PublicPlatformStatsDto> {
  const res = await fetch(`${base()}/api/platform/stats`, {
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    stats?: PublicPlatformStatsDto;
    message?: string;
  };
  if (!res.ok || !data.stats) {
    throw new Error(data.message || "Failed to load platform stats");
  }
  return data.stats;
}
