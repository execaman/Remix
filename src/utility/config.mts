import type { Snowflake } from "discord.js";
import type { SpotifyPluginOptions } from "@distube/spotify";
import type { SoundCloudPluginOptions } from "@distube/soundcloud";

/**
 * MongoDB URI, learn more here
 * https://www.mongodb.com/basics/mongodb-connection-string#how-to-get-your-mongodb-atlas-connection-string
 */

export const db = "";

/**
 * Discord bot token, create an application here
 * https://discord.com/developers/applications
 *
 * Or follow the guide if you have trouble
 * https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot
 */

export const token = "";

export const prefix = ">";
export const owners = new Set<Snowflake>([]);

/**
 * Spotify credentials, create an application here
 * https://developer.spotify.com/documentation/web-api/concepts/apps
 */

export const spotifyOptions: SpotifyPluginOptions = {
  api: {
    clientId: "",
    clientSecret: "",
    topTracksCountry: ""
  }
};

/**
 * SoundCloud credentials, application discontinued, but if you have one, okay..
 */

export const soundCloudOptions: SoundCloudPluginOptions = {
  clientId: "",
  oauthToken: ""
};

/**
 * Discord Emojis supported (except 'wave' & 'warn' you need to edit from code)
 * https://discord.js.org/docs/packages/discord.js/14.14.1/ComponentEmojiResolvable:TypeAlias
 */

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
