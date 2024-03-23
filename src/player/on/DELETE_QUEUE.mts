import { clearTimeout } from "node:timers";
import type Remix from "../../client.mjs";
import type { Queue } from "../../utility/types.mjs";

export default async (client: Remix, queue: Queue) => {
  if (queue.editTimer) {
    clearTimeout(queue.editTimer);
  }
  if (queue.playerMessage) {
    try {
      await queue.playerMessage.delete();
    } catch {}
  }
};
