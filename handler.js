const Chino = require('./Chino');

const tokenizerRegex = /\S+/g;

const tokenizeString = s => s.match(tokenizerRegex);

const tokenize = function(handler) {
  return function(bot, messageInfo) {
    const tokens = messageInfo.message.match(tokenizerRegex);

    return handler(bot, Object.assign({}, messageInfo, {tokens}));
  };
};


const tokenizeIfNecessary = function(handler) {
  return function(bot, messageInfo) {
    return messageInfo.tokens
      ? handler(bot, messageInfo)
      : handler(bot, Object.assign(
        {},
        messageInfo,
        {tokens: tokenizeString(messageInfo.message)}
      ));
  };
};


const combineHandlers = function(handlers) {
  return function() {
    return Promise.all(handlers.map(handler => handler(...arguments)));
  };
};


const requirePrefix = function(prefix, strip=true) {
  return function(handler) {
    return function(bot, messageInfo) {
      const { message } = messageInfo;

      if (message.startsWith(prefix)) {
        if (strip) {
          const newMessageInfo = Object.assign({}, messageInfo, {
            message: message.substr(prefix.length)
          });

          if (messageInfo.tokens && messageInfo.tokens.length > 0) {
            newMessageInfo.tokens = [
              messageInfo.tokens[0].substr(prefix.length)
            ].concat(messageInfo.tokens.slice(1)).filter(t => t.length);
          }

          return handler(bot, newMessageInfo);
        } else {
          return handler(bot, messageInfo);
        }
      } else {
        return Promise.resolve('noop');
      }
    };
  };
};


const gateHandler = function(resolver) {
  return function(id, negate=false) {
    return function(handler) {
      return function(bot, messageInfo) {

        return resolver.call(bot, messageInfo, id)
          .then(function(result) {
            if (negate !== result) {
              return handler(bot, messageInfo);
            } else {
              return Promise.resolve('noop');
            }
          });
      };
    };
  };
};


const splitCommands = function(commandHandlers, defaultHandler, strip=true) {
  const handler = function(bot, messageInfo) {
    const { tokens } = messageInfo;
    console.log(messageInfo);

    const [ command, ...rest ] = tokens;


    if (commandHandlers[command]) {
      const newMessageInfo = Object.assign(
        {},
        messageInfo,
        {
          tokens: strip ? rest : tokens
        }
      );

      return commandHandlers[command](bot, newMessageInfo);
    } else if (defaultHandler) {
      return defaultHandler(bot, messageInfo);
    } else {
      return Promise.resolve('noop');
    }
  };

  return tokenizeIfNecessary(handler);
};


const requirePermission = gateHandler(Chino.prototype.resolvePermission);
const requireSetting = gateHandler(Chino.prototype.resolveSetting);

module.exports = {
  tokenizeIfNecessary,
  combineHandlers,
  tokenize,
  requirePermission,
  requireSetting,
  requirePrefix,
  splitCommands
};
