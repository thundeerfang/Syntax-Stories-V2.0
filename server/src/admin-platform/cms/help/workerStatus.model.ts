import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IWorkerStatus extends Document {
  name: string;
  lastRunAt: Date;
  lastSuccessAt?: Date | null;
  lastError?: string | null;
}

const WorkerStatusSchema = new Schema<IWorkerStatus>(
  {
    name: { type: String, required: true, unique: true },
    lastRunAt: { type: Date, required: true },
    lastSuccessAt: { type: Date, default: null },
    lastError: { type: String, default: null },
  },
  { timestamps: true }
);

export const WorkerStatusModel: Model<IWorkerStatus> =
  mongoose.models?.workerstatuses ??
  mongoose.model<IWorkerStatus>('workerstatuses', WorkerStatusSchema);
