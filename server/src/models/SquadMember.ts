import mongoose, { Schema, Document, Model } from "mongoose";
export type SquadMemberRole = "admin" | "moderator" | "member";
export interface ISquadMember extends Document {
  squadId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: SquadMemberRole;
  createdAt: Date;
  updatedAt: Date;
}
const SquadMemberSchema = new Schema<ISquadMember>(
  {
    squadId: {
      type: Schema.Types.ObjectId,
      ref: "squads",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "moderator", "member"],
      default: "member",
      index: true,
    },
  },
  { timestamps: true },
);
SquadMemberSchema.index({ squadId: 1, userId: 1 }, { unique: true });
export const SquadMemberModel: Model<ISquadMember> =
  mongoose.models?.squadmembers ??
  mongoose.model<ISquadMember>("squadmembers", SquadMemberSchema);
