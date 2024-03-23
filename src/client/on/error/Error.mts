import type Remix from "../../../client.mjs";

export default (client: Remix, err: Error) => {
  console.log(`[client] :: error :: [${client.util.time}]`);
  console.log(err.name, [err.message]);

  if (typeof err.stack === "string") {
    console.log([err.stack]);
  }
};
