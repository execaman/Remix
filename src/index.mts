import Remix from "./client.mjs";
import Discord from "discord.js";

const remix = new Remix({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Discord.Partials.GuildScheduledEvent,
    Discord.Partials.Reaction,
    Discord.Partials.ThreadMember,
    Discord.Partials.User
  ],
  makeCache: Discord.Options.cacheWithLimits({
    AutoModerationRuleManager: 0,
    DMMessageManager: 0,
    GuildBanManager: 0,
    GuildForumThreadManager: 0,
    GuildInviteManager: 0,
    GuildMemberManager: {
      maxSize: 50,
      keepOverLimit: (member) => member.id === member.client.user.id
    },
    GuildMessageManager: 50,
    GuildScheduledEventManager: 0,
    GuildStickerManager: 0,
    GuildTextThreadManager: 0,
    MessageManager: 0,
    PresenceManager: 0,
    ReactionManager: 0,
    ReactionUserManager: 0,
    StageInstanceManager: 0,
    ThreadManager: 0,
    ThreadMemberManager: 0,
    UserManager: 0
  }),
  presence: {
    activities: [
      {
        name: `v${Discord.version}`,
        type: Discord.ActivityType.Streaming,
        url: "https://twitch.tv/#"
      }
    ]
  }
});

for (const event of ["beforeExit", "SIGINT", "SIGHUP"]) {
  process.once(event, async () => {
    if (remix.isReady()) {
      await remix.destroy();
    }
    process.exit(0);
  });
}

remix.stream();
