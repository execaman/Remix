import TextCommandBuilder from "../../../modules/classes/builder.mjs";
import type Remix from "../../../client.mjs";
import type { Message, Queue } from "../../../utility/types.mjs";

export const data = new TextCommandBuilder()
  .setName("play")
  .setDescription("play a song by name or url");

export async function execute(client: Remix, message: Message, args: string[]) {
  if (!message.repliable) return;

  const query = args.join("");

  if (query.length === 0) {
    await message.reply({
      embeds: [client.errorEmbed("No name or url provided to play from")]
    });
    return;
  }

  const queue = client.player.getQueue(message.guildId) as Queue | undefined;
  const member = await message.guild.members.fetch(message.author.id);

  if (!member.voice.channel || (queue && queue.voice.channelId !== member.voice.channelId)) {
    await message.reply({
      embeds: [
        client.errorEmbed(`You must be in ${!member.voice.channel ? "a" : "my"} voice channel`)
      ]
    });
    return;
  }

  const reply = await message.reply({
    embeds: [client.playerAlertEmbed({ title: `Attempting to play..` })]
  });

  try {
    await client.player.play(member.voice.channel, query, {
      member: member,
      textChannel: queue?.textChannel || message.channel
    });
  } catch {
    await reply.edit({
      embeds: [client.errorEmbed()]
    });
    return;
  }

  if (message.channelId === queue?.textChannel?.id) {
    await reply.delete();
    return;
  }

  await reply.edit({
    embeds: [
      client.playerAlertEmbed({
        title: queue ? "Now Playing" : "Added to Queue",
        description: queue?.songs[0].name?.slice(0, 45).trim() || null
      })
    ]
  });
}
