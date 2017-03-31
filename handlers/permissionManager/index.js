const { requirePermission, splitCommands, requirePrefix } = require('../../handler');
const { SET_GLOBAL_PERM, SET_SERVER_PERM } = require('./permissions');

const validateSnowflake = s => /[0-9]+/.test(s);
const validatePermValue = s => s === 'true' || s === 'false';

const setGlobalUserPermission = function(redis, perm, userID, value) {
  return redis.setAsync(`shinobu_perm:${perm}:global:${userID}`, JSON.stringify(value));
};

const setGlobalPermission = function(redis, perm, value) {
  return redis.setAsync(`shinobu_perm:${perm}:global`, JSON.stringify(value));
};

const setServerPermission = function(redis, perm, serverID, value) {
  return redis.getAsync(`shinobu_perm:${perm}:meta`)
    .then(JSON.parse)
    .then(permMeta => permMeta.server_overridable
      ? redis.setAsync(
          `shinobu_perm:${perm}:${serverID}`,
          JSON.stringify(value)
        )
      : Promise.reject("Can't override permission per server"));
};

const setServerUserPermission = function(redis, perm, serverID, userID, value) {
  return redis.getAsync(`shinobu_perm:${perm}:meta`)
    .then(JSON.parse)
    .then(permMeta => permMeta.server_overridable
      ? redis.setAsync(
          `shinobu_perm:${perm}:${serverID}:${userID}`,
          JSON.stringify(value)
        )
      : Promise.reject("Can't override permission per server"));
};

const globalHandler = requirePermission(SET_GLOBAL_PERM)(
  function(bot, messageInfo) {
    const { redis } = bot;
    const { channelID, tokens, user } = messageInfo;

    if (tokens.length === 2) {
      const [ permission, value ] = tokens;
      if (validatePermValue(value)) {
        return setGlobalPermission(redis, permission, JSON.parse(value))
          .then(() => bot.sendMessage({
            to: channelID,
            message: `Permission ${permission} set to ${value} globally.`
          }));
      }
    }

    if (tokens.length === 3) {
      const [ userID, permission, value ] = tokens;

      if (validatePermValue(value)) {
        return setGlobalUserPermission(
          redis, permission, serverID, JSON.parse(value)
        ).then(() => bot.sendMessage({
            to: channelID,
            message: `Permission ${permission} set to ${value} globally for ${user}.`
          }));
      }
    }

    return Promise.resolve('noop');
  }
);

const serverHandler = requirePermission(SET_SERVER_PERM)(
  function(bot, messageInfo) {
    console.log('hi');
    const { redis } = bot;
    const { channelID, tokens, user } = messageInfo;
    const serverID = bot.serverFromChannelID(channelID);

    if (tokens.length === 2) {
      const [ permission, value ] = tokens;

      if (validateSnowflake(channelID) && validatePermValue(value)) {
        return setServerPermission(
          redis,
          permission,
          serverID,
          JSON.parse(value)
        ).then(() => bot.sendMessage({
          to: channelID,
          message: `Permission ${permission} set to ${value} in server ${serverID}`
        }));
      }
    }

    if (tokens.length === 3) {
      const [ userID, permission, value ] = tokens;

      if (
        validateSnowflake(channelID) && 
        validateSnowflake(userID) && 
        validatePermValue(value)
      ) {
        return setServerUserPermission(
          redis,
          permission,
          serverID,
          userID,
          JSON.parse(value)
        ).then(() => bot.sendMessage({
          to: channelID,
          message: `Permission ${permission} set to ${value} for user ${user} in server ${serverID}`
        }));
      } 
    }
  }
);


const permissionManager = requirePrefix('!perm')(splitCommands({
  global: globalHandler
}, serverHandler));

module.exports = permissionManager;
