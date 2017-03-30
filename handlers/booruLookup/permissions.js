const constants = require('./constants');

module.exports = [
  {
    name: constants.BOORU_MODIFY_BLOCKED_TAGS,
    default_value: false,
    server_owner_default_value: true,
    server_overridable: true
  },
  {
    name: constants.BOORU_SAVE_PICTURE,
    default_value: false,
    server_owner_default_value: true,
    server_overridable: true
  }
];