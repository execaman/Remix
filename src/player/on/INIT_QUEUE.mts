import type Remix from "../../client.mjs";
import type { Queue } from "../../utility/types.mjs";

export default async (client: Remix, queue: Queue) => {
  queue.volume = 80;
  queue.filters.add(["44.1kHz", "Smooth"]);

  queue.lastAction = {
    icon: client.user.displayAvatarURL(),
    text: `${client.user.username}: Play Song`,
    time: Date.now()
  };
};
