const { REQUIRE_MENTION } = require('./constants');
const { requireSetting } = require('../../handler');


const requireMention = function(trimMessage=true) {
  return function(handler) {
    const gatedHandler = requireSetting(REQUIRE_MENTION, true)(handler);

    return function(bot, messageInfo) {
      const mentionString = `<@${bot.client.id}>`;
      
      // check for mention
      if (messageInfo.message.startsWith(mentionString)) {
        const message = trimMessage
            ? messageInfo.message.slice(mentionString.length).trim()
            : messageInfo.message;

        const newMessageInfo = Object.assign({}, messageInfo, { message });

        return handler(bot, newMessageInfo);
      } else {
        return gatedHandler(bot, messageInfo);
      }
    };
  };
};

module.exports = requireMention;
