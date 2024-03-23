import { Schema, type Document } from "mongoose";
import { prefix } from "../utility/config.mjs";

export interface IGuild extends Document {
  id: string;
  prefix: string;
}

export default new Schema(
  {
    id: { type: String, required: true },
    prefix: { type: String, default: prefix }
  },
  { id: false, autoIndex: false }
);
