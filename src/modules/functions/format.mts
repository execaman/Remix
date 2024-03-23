import { inspect } from "node:util";

export default async function format(code: any) {
  let text: string = code?.constructor?.name === "Promise" ? await code : code;
  if (typeof text !== "string") {
    text = inspect(text, { depth: 1 });
  }
  text = text
    .replace(/`/g, "`" + String.fromCharCode(8203))
    .replace(/@/g, "@" + String.fromCharCode(8203));
  return text;
}
