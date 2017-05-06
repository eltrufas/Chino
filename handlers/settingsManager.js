const tokenRegex = /\S+/g;

const { PERM_EDIT_GLOBAL, PERM_EDIT_SERVER } = require('../permissions/settingsManager');

const validateSettingValue = function(setting, value) {
  const type = setting.type || 'boolean';

  switch (type) {
    case 'boolean':
      return value === 'true' || value === 'false';
    case 'integer':
      // checks if value is an integer
      return Number(value) === parseInt(value);
    case 'enumeration':
      return setting.values.any(v => v === value);
    default:
      return true;
  }
};

const settingsManager = function(bot, { userID, channelID, message }, tokens) {
  tokens = tokens || message.match(tokenRegex);
  if (!tokens || tokens.length < 3 || tokens[0] !== '!set') {
    return Promise.resolve('noop');
  }

  const serverID = bot.serverFromChannelID(channelID);

  let global, setting, value, valueKey;
  if (tokens[1] === 'global') {
    global = true;
    [, , setting, value] = tokens;
    valueKey = `shinobu_setting:${setting}:global`;
  } else {
    global = false;
    [, setting, value] = tokens;
    valueKey = `shinobu_setting:${setting}:${serverID}`;
  }

  const { redis } = bot;
  const requiredPerm = global ? PERM_EDIT_GLOBAL : PERM_EDIT_SERVER;

  return Promise.all([
    bot.resolvePermission({ userID, channelID }, requiredPerm),
    redis.getAsync(`shinobu_setting:${setting}:meta`)
  ])
    .then(function([editPermission, metadata]) {
      metadata = JSON.parse(metadata);

      const overridable = global
        ? metadata.global_overridable || false
        : metadata.server_overridable;

      console.log(editPermission);

      if (
        editPermission && overridable && validateSettingValue(metadata, value)
      ) {
        return redis.set(valueKey, value);
      } else {
        return Promise.reject('setting cannot be changed');
      }
    })
    .then(function() {
      bot.sendMessage({
        to: channelID,
        message: `Setting ${setting} set to ${value} ${global ? 'globally' : 'in server'}.`
      });
    });
};

module.exports = settingsManager;
