import type { Request } from "express";
export function oauthFlowFromReq(req: Pick<Request, "query">): string {
  const raw = req.query?.state;
  return typeof raw === "string" && raw.length > 0 ? raw : "login";
}
