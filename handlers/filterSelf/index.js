const { IGNORE_SELF } = require('./constants');

const filterSelf = function(handler){
  return function(bot, messageInfo) {
    bot.resolveSetting(messageInfo, IGNORE_SELF).then(shouldFilter => {
      if (!shouldFilter || bot.id !== messageInfo.userID) {
        return handler(bot, messageInfo);
      } else {
        return Promise.resolve('noop');
      }
    });
  };
};

module.exports = filterSelf;
