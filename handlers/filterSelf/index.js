const { IGNORE_SELF } = require('./settings');

const filterSelf = function(handler) {
  return function(bot, messageInfo, tokens) {
    bot.resolveSetting(messageInfo, IGNORE_SELF).then(shouldFilter => 
      !shouldFilter || bot.client.id !== messageInfo.userID
        ? handler(bot, messageInfo, tokens)
        : Promise.resolve('noop')
    );
  };
};

module.exports = filterSelf;
