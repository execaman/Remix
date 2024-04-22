import type Remix from "../../../client.mjs";
import type { CloseEvent } from "discord.js";

export default async (client: Remix, event: CloseEvent, id: number) => {
  console.log(`🟥[shard#${id}] :: disconnected{${event.code}} :: [${client.util.time}]`);
};
