import { Schema, type Document } from "mongoose";
import type { SavedSong } from "../utility/types.mjs";

export interface IUser extends Document {
  id: string;
  songs: SavedSong[];
}

const SavedSongSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    url: { type: String, required: true }
  },
  { _id: false, id: false, autoIndex: false }
);

export default new Schema(
  {
    id: { type: String, required: true },
    songs: { type: [SavedSongSchema], default: [] }
  },
  { id: false, autoIndex: false }
);
