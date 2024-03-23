import type Remix from "../../../client.mjs";

export default async (client: Remix, err: Error, id: number) => {
  console.log(`🟧[shard#${id}] :: error :: [${client.util.time}]`);
};
