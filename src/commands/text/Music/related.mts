import { Events } from "distube";
import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message, Queue } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("related")
  .setDescription("adds a song related to the current one");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  const queue = client.player.getQueue(message.guildId) as Queue | undefined;

  if (!queue) {
    await message.reply({
      embeds: [client.errorEmbed("The player is inactive at the moment")]
    });
    return;
  }

  const member = await message.guild.members.fetch(message.author.id);

  if (!member.voice.channel || queue.voice.channelId !== member.voice.channelId) {
    await message.reply({
      embeds: [
        client.errorEmbed(`You must be in ${!member.voice.channel ? "a" : "my"} voice channel`)
      ]
    });
    return;
  }

  try {
    const song = await queue.addRelatedSong();

    client.player.emit(Events.ADD_SONG, queue, song);

    if (message.channelId !== queue.textChannel?.id) {
      await message.reply({
        embeds: [
          client.playerAlertEmbed({
            title: "Added Related Song",
            description: `${song.name?.slice(0, 45).trim() || "Untitled Track"}`
          })
        ]
      });
    }
  } catch {
    await message.reply({
      embeds: [client.errorEmbed()]
    });
  }
}
