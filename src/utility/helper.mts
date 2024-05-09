export * from "../modules/index.mjs";
export * from "./filters.mjs";

import { Lyricist } from "@execaman/lyricist";
import { Song, SearchResult, SearchResultType, RelatedSong } from "distube";
import type { SavedSong } from "./types.mjs";

export const lyrics = new Lyricist();

export function formatSong(
  song: Song | SearchResult | RelatedSong,
  songLength = 97,
  uploaderLength = 20
) {
  return {
    name: song.name!.slice(0, songLength),
    description: `${"type" in song && song.type === SearchResultType.PLAYLIST ? `Songs: ${song.length}` : `Duration: ${song.formattedDuration}`} | Uploader: ${song.uploader.name?.slice(0, uploaderLength) || "Unknown"}`,
    url: song.url
  } satisfies SavedSong;
}
