import { enrichStackAndToolsDisplay } from "../../services/techStackReference.service.js";
export async function attachStackAndToolsDisplay(
  user: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const stackAndToolsDisplay = await enrichStackAndToolsDisplay(
    user.stackAndTools,
  );
  if (stackAndToolsDisplay.length === 0) {
    return user;
  }
  return { ...user, stackAndToolsDisplay };
}
