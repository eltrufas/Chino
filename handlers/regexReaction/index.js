const {
  requirePrefix,
  requirePermission,
  splitCommands
} = require('../../handler');
const { MANAGE_AUTO_REACTIONS } = require('./permissions');

const encodeEmoji = function(emoji) {
  if (emoji.length > 2) {
    return encodeURIComponent(emoji.substring(2, emoji.length - 1));
  } else {
    return encodeURIComponent(emoji);
  }
}

const handleAddReaction = requirePermission(MANAGE_AUTO_REACTIONS)(
  function(bot, messageInfo) {
    const { channelID, tokens } = messageInfo;
    const serverID = bot.serverFromChannelID(channelID);
    const { redis } = bot;

    if (tokens.length != 2) {
      return Promise.resolve('noop');
    }

    const [ emoji, regexString ] = tokens;

    const reaction = {
      emoji: encodeEmoji(emoji),
      regex: regexString
    };

    return redis.lpushAsync(
      `shinobu_auto_reacts:${serverID}`,
      JSON.stringify(reaction)
    ).then(() => bot.sendMessage({
      to: channelID,
      message: 'Added reaction'
    }));
  }
);

const handleClearReactions = requirePermission(MANAGE_AUTO_REACTIONS)(
  function(bot, messageInfo) {
    const { channelID } = messageInfo;
    const { redis } = bot;
    const serverID = bot.serverFromChannelID(channelID);

    redis.delAsync(`shinobu_auto_reacts:${serverID}`)
      .then(() => bot.sendMessage({
        to: channelID,
        message: 'Cleared all reactions'
      }));
  }
);

const safeRegexParse = function(regexString) {
  try {
    const re = RegExp(regexString);
    return re;
  } catch(e) {
    return null;
  }
}

const checkReaction = function(bot, messageInfo) {
  const { channelID, message } = messageInfo;
  const serverID = bot.serverFromChannelID(channelID);
  const { redis } = bot;

  return redis.lrangeAsync(`shinobu_auto_reacts:${serverID}`, 0, -1)
    .then(reactions => reactions.map(JSON.parse).map(reaction => ({
      regex: safeRegexParse(reaction.regex),
      emoji: reaction.emoji
    })).reduce((acc, reaction) => {
      if (reaction.regex && reaction.regex.test(message)) {
        return acc.concat([reaction.emoji]);
      } else {
        return acc;
      }
    }, []).map(emoji => bot.addReaction({
        channelID,
        messageID: messageInfo.rawEvent.d.id,
        reaction: emoji
    })));
}

const handlers = {
  add: handleAddReaction,
  clear: handleClearReactions
};

const regexReaction =
  requirePrefix('!react')(splitCommands(handlers, handleAddReaction));

module.exports = {
    manager: regexReaction,
    watcher: checkReaction
};
