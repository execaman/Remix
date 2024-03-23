export * from "../modules/index.mjs";
import { Lyricist } from "@execaman/lyricist";
import type { Song, SearchResultVideo, RelatedSong } from "distube";
import type { SavedSong } from "./types.mjs";

export const lyrics = new Lyricist();

export function formatSong(
  song: Song | SearchResultVideo | RelatedSong,
  songLength = 97,
  uploaderLength = 20
) {
  return {
    name: song.name!.slice(0, songLength),
    description: `Duration: ${song.formattedDuration || song.isLive ? "Live" : "Unknown"} | Uploader: ${song.uploader.name?.slice(0, uploaderLength) || "Unknown"}`,
    url: song.url
  } satisfies SavedSong;
}
