const Chino = require('./Chino');

const tokenizerRegex = /(".*"|\S)+/g;

const tokenizeString = message =>
  message
    .match(tokenizerRegex)
    .map(
      token => token[0] === '"' ? token.substring(1, token.length - 1) : token
    );

const tokenize = function(handler) {
  return function(bot, messageInfo) {
    const tokens = tokenizeString(messageInfo.message);

    return handler(bot, messageInfo, tokens);
  };
};

const tokenizeIfNecessary = function(handler) {
  return function(bot, messageInfo, tokens) {
    return tokens
      ? handler(bot, messageInfo, tokens)
      : handler(
        bot,
        messageInfo,
        tokenizeString(messageInfo.message)
      );
  };
};

const combineHandlers = function(handlers) {
  return function(...args) {
    return Promise.all(handlers.map(handler => handler(...args)));
  };
};

const requirePrefix = function(prefix, strip = true) {
  return function(handler) {
    return function(bot, messageInfo, tokens) {
      const { message } = messageInfo;

      if (message.startsWith(prefix)) {
        if (strip) {
          const newMessageInfo = Object.assign({}, messageInfo, {
            message: message.substr(prefix.length)
          });

          const newTokens = tokens && tokens.length > 0
            ? [
                tokens[0].substr(prefix.length)
              ]
                .concat(tokens.slice(1))
                .filter(t => t.length)
            : tokens;

          return handler(bot, newMessageInfo, newTokens);
        } else {
          return handler(bot, messageInfo, tokens);
        }
      } else {
        return Promise.resolve('noop');
      }
    };
  };
};

const gateHandler = function(resolver) {
  return function(id, negate = false) {
    return function(handler) {
      return function(bot, messageInfo, ...args) {
        return resolver.call(bot, messageInfo, id).then(result =>
          negate !== result
            ? handler(bot, messageInfo, ...args)
            : Promise.resolve('noop')
        );
      };
    };
  };
};

const splitCommands = function(commandHandlers, defaultHandler, strip = true) {
  const handler = function(...args) {
    const [bot, messageInfo, tokens] = args;
    const [command, ...rest] = tokens;

    if (commandHandlers[command]) {
      
     
      const newMessageInfo = Object.assign({}, messageInfo, {
        message: messageInfo.message.substr(command.length)
      });

      const newTokens = strip ? rest : tokens;

      return commandHandlers[command](bot, newMessageInfo, newTokens);
    } else if (defaultHandler) {
      return defaultHandler(...args);
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
