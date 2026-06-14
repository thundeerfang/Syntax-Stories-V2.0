import { Router } from "express";
import { verifyToken } from "../middlewares/auth/index.js";
import { optionalVerifyToken } from "../middlewares/auth/optionalVerifyToken.js";
import {
  createSquad,
  deleteSquad,
  getSquadBySlug,
  getSquadFeed,
  joinSquad,
  leaveSquad,
  listMySquads,
  listSquadsForUser,
  listPublicSquads,
  listSquadMembers,
  patchSquad,
  patchSquadMemberRole,
  postSquadMember,
  postSquadShare,
  postSquadPin,
  deleteSquadPin,
  getSquadMemberStats,
  deleteSquadMember,
} from "../controllers/squad.controller.js";
const router = Router();
router.get("/", listPublicSquads);
router.get("/mine", verifyToken, listMySquads);
router.get("/u/:username", optionalVerifyToken, listSquadsForUser);
router.post("/", verifyToken, createSquad);
router.get("/s/:slug", optionalVerifyToken, getSquadBySlug);
router.patch("/s/:slug", verifyToken, patchSquad);
router.get("/s/:slug/feed", optionalVerifyToken, getSquadFeed);
router.get("/s/:slug/members", optionalVerifyToken, listSquadMembers);
router.get(
  "/s/:slug/members/:username/stats",
  optionalVerifyToken,
  getSquadMemberStats,
);
router.post("/s/:slug/join", verifyToken, joinSquad);
router.post("/s/:slug/leave", verifyToken, leaveSquad);
router.delete("/s/:slug", verifyToken, deleteSquad);
router.post("/s/:slug/members", verifyToken, postSquadMember);
router.patch("/s/:slug/members/role", verifyToken, patchSquadMemberRole);
router.delete("/s/:slug/members/:username", verifyToken, deleteSquadMember);
router.post("/s/:slug/shares", verifyToken, postSquadShare);
router.post("/s/:slug/pins", verifyToken, postSquadPin);
router.delete("/s/:slug/pins/:postId", verifyToken, deleteSquadPin);
export default router;
