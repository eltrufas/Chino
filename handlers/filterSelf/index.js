const { IGNORE_SELF } = require('./settings');

const filterSelf = function(handler) {
  return function(bot, messageInfo) {
    bot.resolveSetting(messageInfo, IGNORE_SELF).then(shouldFilter => 
      !shouldFilter || bot.id !== messageInfo.userID
        ? handler(bot, messageInfo)
        : Promise.resolve('noop')
    );
  };
};

module.exports = filterSelf;
