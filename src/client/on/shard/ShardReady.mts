import type Remix from "../../../client.mjs";
import type { Snowflake } from "discord.js";

export default async (client: Remix, id: number, na?: Set<Snowflake>) => {
  if (na instanceof Set && na.size !== 0) {
    console.log(`🟧[shard#${id}] :: downgraded{${na.size}} :: [${client.util.time}]`);
    console.log(" ", [...na].slice(0, 5));
  } else {
    console.log(
      `🟩[shard#${id}] :: connected{${client.options.shardCount || client.shard?.count || 1}} :: [${client.util.time}]`
    );
  }
};
