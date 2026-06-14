import mongoose from "mongoose";
import {
  RewardGrantModel,
  type RewardSourceType,
  type RewardType,
} from "../../models/RewardGrant.js";
import { addXpAndPoints } from "../achievements/userStats.service.js";
export type GrantRewardArgs = {
  userId: string;
  sourceType: RewardSourceType;
  sourceId: string;
  rewardType: RewardType;
  amount?: number;
  points?: number;
};
export type GrantRewardResult =
  | {
      granted: true;
      duplicate: false;
    }
  | {
      granted: false;
      duplicate: true;
    }
  | {
      granted: false;
      duplicate: false;
      error: string;
    };
export async function grantReward(
  args: GrantRewardArgs,
): Promise<GrantRewardResult> {
  if (!mongoose.isValidObjectId(args.userId)) {
    return { granted: false, duplicate: false, error: "invalid_user" };
  }
  try {
    await RewardGrantModel.create({
      userId: new mongoose.Types.ObjectId(args.userId),
      sourceType: args.sourceType,
      sourceId: args.sourceId.slice(0, 128),
      rewardType: args.rewardType,
      amount: args.amount,
    });
  } catch (e) {
    const dup =
      (
        e as {
          code?: number;
        }
      ).code === 11000;
    if (dup) return { granted: false, duplicate: true };
    throw e;
  }
  if (
    args.rewardType === "xp" &&
    typeof args.amount === "number" &&
    args.amount > 0
  ) {
    await addXpAndPoints(args.userId, args.points ?? 0, args.amount);
  } else if (typeof args.points === "number" && args.points > 0) {
    await addXpAndPoints(args.userId, args.points, 0);
  }
  return { granted: true, duplicate: false };
}
export const RewardEngine = { grant: grantReward };
