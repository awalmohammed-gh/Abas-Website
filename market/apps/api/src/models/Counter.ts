import { Schema, model, type ClientSession } from "mongoose";

interface CounterDoc {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<CounterDoc>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = model<CounterDoc>("Counter", counterSchema);

/** Atomically returns the next value of a named sequence. */
export async function nextSequence(name: string, session?: ClientSession): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", session },
  ).lean();
  if (!counter) throw new Error(`Could not allocate a value for sequence "${name}"`);
  return counter.seq;
}
