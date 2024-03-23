import type Discord from "discord.js";
import type DisTube from "distube";
import type { LyricResult } from "@execaman/lyricist";

export type Queue = DisTube.Queue & {
  editCount?: number;
  editTimer?: NodeJS.Timeout;
  lastAction: {
    icon: string;
    text: string;
    time: number;
  };
  lyricId?: string;
  lyricData?: LyricResult;
  playerMessage?: Discord.Message<true>;
};

export interface SavedSong {
  name: string;
  description: string;
  url: string;
}

export type Message = Discord.Message<true> & {
  repliable: boolean;
};

export type Permission = Discord.PermissionFlags[keyof Discord.PermissionFlags];

export interface Permissions {
  client?: Permission[];
  member?: Permission[];
}

export interface Subcommand {
  name: string;
  usage?: string;
  owner?: boolean;
  aliases?: string[];
  description?: string;
  permissions?: Permissions;
  subcommands?: Subcommand[];
}
