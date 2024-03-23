import type Remix from "../../../client.mjs";

export default async (client: Remix, warning: string) => {
  console.log(`[client] :: warning :: [${client.util.time}]`);
  console.log([warning]);
};
