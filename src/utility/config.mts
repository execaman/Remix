import type { Snowflake } from "discord.js";
import type { SpotifyPluginOptions } from "@distube/spotify";
import type { SoundCloudPluginOptions } from "@distube/soundcloud";

export const db = "";

export const token = "";

export const prefix = ">";
export const owners = new Set<Snowflake>([]);

export const spotifyOptions: SpotifyPluginOptions = {
  api: {
    clientId: "",
    clientSecret: "",
    topTracksCountry: ""
  }
};

export const soundCloudOptions: SoundCloudPluginOptions = {
  clientId: "",
  oauthToken: ""
};

export const audioFilters: {
  [filterName: string]: string;
} = {
  "Smooth": "adynamicsmooth",
  "48kHz": "aresample=48000",
  "44.1kHz": "aresample=44100"
};

export const emoji = {
  wave: "👋",
  warn: "⚠️",
  record: "⏺️",
  song: "🎵",
  queue: "🎶",
  volume: "🎚️",
  reverse: "⏪",
  play: "▶️",
  pause: "⏸️",
  forward: "⏩",
  volumeUp: "🔊",
  previous: "⏮️",
  stop: "⏹️",
  next: "⏭️",
  volumeDown: "🔉",
  repeatOne: "🔂",
  repeatTwo: "🔁",
  autoplay: "🌀",
  get clock() {
    const clocks = [
      "🕛",
      "🕧",
      "🕐",
      "🕜",
      "🕑",
      "🕝",
      "🕒",
      "🕕",
      "🕠",
      "🕔",
      "🕟",
      "🕓",
      "🕞",
      "🕡",
      "🕖",
      "🕢",
      "🕗",
      "🕣",
      "🕘",
      "🕦",
      "🕚",
      "🕥",
      "🕙",
      "🕤"
    ];
    return clocks[Math.floor(Math.random() * clocks.length)];
  }
};
