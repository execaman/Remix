import type Remix from "../../../client.mjs";

export default async (client: Remix, id: number) => {
  console.log(`🟨[shard#${id}] :: reconnecting :: [${client.util.time}]`);
};
