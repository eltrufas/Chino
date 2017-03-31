const constants = require('./constants');

module.exports = [
  {
    name: constants.SET_GLOBAL_PERM,
    default_value: false,
    server_overridable: false
  },
  {
    name: constants.SET_SERVER_PERM,
    default_value: false,
    server_owner_default_value: true,
    server_overridable: true
  }
]
