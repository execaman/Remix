import Discord from "discord.js";
import type Menu from "./menu.mjs";
import type Remix from "../../client.mjs";
import type { LyricInfo, LyricResult } from "@execaman/lyricist";

type Interaction =
  | Discord.ButtonInteraction<"cached">
  | Discord.ChatInputCommandInteraction<"cached">;

type CollectorInteraction = Discord.ButtonInteraction<"cached"> & {
  client: Remix;
};

type LyricRequestInteraction = Interaction & { client: Remix };

export default class LyricRequest {
  interaction: LyricRequestInteraction = null!;

  data: LyricResult = null!;
  menu: Menu<string> = null!;

  collector: Discord.InteractionCollector<Discord.ButtonInteraction<"cached">> =
    null!;

  constructor(interaction: Interaction, data: LyricResult) {
    this.interaction = interaction as LyricRequestInteraction;
    this.data = data;

    const split = data.lyrics.split("\n\n");

    const pages = split.reduce<string[]>((total, current, index) => {
      if (index % 3 === 0) {
        total.push(current);
      } else {
        total[total.length - 1] = total.at(-1)!.concat(`\n\n${current}`);
      }
      return total;
    }, []);

    this.menu = new (interaction.client as Remix).util.menu(pages);
  }

  async destroy(internal = false) {
    this.collector.removeAllListeners();

    if (!this.collector.ended) {
      this.collector.stop();
    }

    (this.collector as any) = null;
    (this.menu as any) = null;
    (this.data as any) = null;

    try {
      if (!internal) {
        await this.interaction.deleteReply();
      } else {
        await this.interaction.editReply({
          embeds: [this.interaction.client.errorEmbed("Interaction timed out")],
          components: []
        });
      }
    } catch {}

    this.interaction.client.sessions.delete(this.interaction.user.id);
    (this.interaction as any) = null;
  }

  async init() {
    const message = await this.interaction.editReply({
      embeds: [this.lyricEmbed(this.menu.currentItem as string)],
      components: this.lyricComponents()
    });

    this.collector =
      message.createMessageComponentCollector<Discord.ComponentType.Button>({
        dispose: true,
        idle: this.interaction.client.util.time.ms("03:00")
      });

    this.collector.once("end", async () => {
      await this.destroy(true);
    });

    this.collector.on("collect", async (i) => {
      await this.handleRequest(i as CollectorInteraction);
    });
  }

  async handleRequest(interaction: CollectorInteraction) {
    const action = interaction.customId.split("_").pop() as string;

    if (
      ["firstItem", "previousItem", "nextItem", "lastItem"].includes(action)
    ) {
      await interaction.update({
        embeds: [this.lyricEmbed((this.menu as any)[action] as string)],
        components: this.lyricComponents()
      });
      return;
    }

    if (action === "translate") {
      await interaction.update({
        components: this.lyricComponents("translate")
      });
      return;
    }

    if (action === "language") {
      await interaction.showModal(this.languageCodeModal());

      try {
        const modal = await interaction.awaitModalSubmit({
          dispose: true,
          time: interaction.client.util.time.ms("01:00")
        });

        await modal.deferReply({ ephemeral: true });

        const code = modal.fields.getTextInputValue("code");

        try {
          const { sentences } = await interaction.client.util.translate(
            this.data.lyrics,
            code
          );

          const pages = sentences.reduce<string[]>((total, current, index) => {
            if (current.orig && current.trans) {
              const transcript = `${current.orig.trim()}\n${current.trans.trim()}`;

              if (index % 5 === 0) {
                total.push(transcript);
              } else {
                total[total.length - 1] = total
                  .at(-1)!
                  .concat(`\n\n${transcript}`);
              }
            }
            return total;
          }, []);

          const menu = new interaction.client.util.menu(pages);

          if (menu.currentItem!.length >= 4000) {
            throw null;
          }

          this.menu = menu;

          await interaction.editReply({
            embeds: [this.lyricEmbed(this.menu.currentItem as string)],
            components: this.lyricComponents()
          });

          await modal.deleteReply();
        } catch {
          await modal.editReply({
            embeds: [interaction.client.errorEmbed()]
          });
        }
      } catch {
        await interaction.followUp({
          embeds: [interaction.client.errorEmbed("Interaction timed out")]
        });
      }
      return;
    }

    if (action === "info") {
      await interaction.update({
        embeds: [this.lyricEmbed(this.data.info as LyricInfo[])],
        components: this.lyricComponents("info")
      });
      return;
    }

    await interaction.update({
      embeds: [this.lyricEmbed(this.menu.currentItem as string)],
      components: this.lyricComponents()
    });
  }

  lyricEmbed(data: string | LyricInfo[]) {
    const embed = new Discord.EmbedBuilder().setColor(Discord.Colors.Yellow);

    if (typeof data === "string") {
      embed.setDescription(data);
    } else {
      embed.setFields(
        data.map((info) => ({
          name: info.label,
          value: Discord.codeBlock(info.value)
        }))
      );
    }
    return embed;
  }

  lyricComponents(phase?: "translate" | "info") {
    if (phase === "translate") {
      return [this.lyricNav(), this.lyricTranslate()];
    } else if (phase === "info") {
      return this.lyricInfo();
    }
    return [this.lyricNav(), this.lyricDefault()];
  }

  languageCodeModal() {
    return new Discord.ModalBuilder()
      .setCustomId(this.interaction.user.id.concat("_translate"))
      .setTitle("Translate")
      .setComponents(
        new Discord.ActionRowBuilder<Discord.TextInputBuilder>().setComponents(
          new Discord.TextInputBuilder()
            .setCustomId("code")
            .setStyle(Discord.TextInputStyle.Short)
            .setLabel("Language Code")
            .setPlaceholder("Enter language code")
            .setMinLength(2)
            .setRequired(true)
        )
      );
  }

  lyricNav() {
    return new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
      new Discord.ButtonBuilder()
        .setCustomId(this.interaction.user.id.concat("_firstItem"))
        .setStyle(Discord.ButtonStyle.Secondary)
        .setEmoji(this.interaction.client.config.emoji.previous)
        .setDisabled(!this.menu.previous),

      new Discord.ButtonBuilder()
        .setCustomId(this.interaction.user.id.concat("_previousItem"))
        .setStyle(Discord.ButtonStyle.Secondary)
        .setEmoji(this.interaction.client.config.emoji.reverse)
        .setDisabled(!this.menu.previous),

      new Discord.ButtonBuilder()
        .setCustomId(this.interaction.user.id.concat("_nextItem"))
        .setStyle(Discord.ButtonStyle.Secondary)
        .setEmoji(this.interaction.client.config.emoji.forward)
        .setDisabled(!this.menu.next),

      new Discord.ButtonBuilder()
        .setCustomId(this.interaction.user.id.concat("_lastItem"))
        .setStyle(Discord.ButtonStyle.Secondary)
        .setEmoji(this.interaction.client.config.emoji.next)
        .setDisabled(!this.menu.next)
    );
  }

  lyricDefault() {
    return new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
      new Discord.ButtonBuilder()
        .setStyle(Discord.ButtonStyle.Link)
        .setLabel("Source")
        .setURL(this.data.source.url),

      new Discord.ButtonBuilder()
        .setCustomId(this.interaction.user.id.concat("_translate"))
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Translate"),

      new Discord.ButtonBuilder()
        .setCustomId(this.interaction.user.id.concat("_info"))
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("More Info")
        .setDisabled(!this.data.info)
    );
  }

  lyricInfo() {
    const components = [
      new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
        new Discord.ButtonBuilder()
          .setCustomId(this.interaction.user.id.concat("_back"))
          .setStyle(Discord.ButtonStyle.Secondary)
          .setLabel("Back"),

        new Discord.ButtonBuilder()
          .setStyle(Discord.ButtonStyle.Link)
          .setLabel("Source")
          .setURL(this.data.source.url),

        new Discord.ButtonBuilder()
          .setCustomId(this.interaction.user.id.concat("_info"))
          .setStyle(Discord.ButtonStyle.Secondary)
          .setLabel("More Info")
          .setDisabled(true)
      )
    ];
    if (this.data.listen) {
      components.unshift(
        new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
          this.data.listen
            .map((platform) =>
              new Discord.ButtonBuilder()
                .setStyle(Discord.ButtonStyle.Link)
                .setLabel(platform.source)
                .setURL(platform.stream)
            )
            .slice(0, 5)
        )
      );
    }
    return components;
  }

  lyricTranslate() {
    return new Discord.ActionRowBuilder<Discord.ButtonBuilder>().setComponents(
      new Discord.ButtonBuilder()
        .setCustomId(this.interaction.user.id.concat("_back"))
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Back"),

      new Discord.ButtonBuilder()
        .setCustomId(this.interaction.user.id.concat("_language"))
        .setStyle(Discord.ButtonStyle.Secondary)
        .setLabel("Language"),

      new Discord.ButtonBuilder()
        .setStyle(Discord.ButtonStyle.Link)
        .setLabel("Language Codes")
        .setURL(
          `https://cloud.google.com/translate/docs/languages#try-it-for-yourself`
        )
    );
  }
}
