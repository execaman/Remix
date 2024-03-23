import { clearTimeout } from "node:timers";
import type Remix from "../../client.mjs";
import type { Queue } from "../../utility/types.mjs";
import type { Song } from "distube";

export default async (client: Remix, queue: Queue, song: Song) => {
  if (queue.editTimer) {
    clearTimeout(queue.editTimer);
  }
  if (queue.playerMessage) {
    try {
      await queue.playerMessage.delete();
    } catch {}
  }
};
