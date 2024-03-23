import type Remix from "../../../client.mjs";

export default async (client: Remix, id: number, events: number) => {
  console.log(
    `🟦[shard#${id}] :: reconnected{${events}} :: [${client.util.time}]`
  );
};
