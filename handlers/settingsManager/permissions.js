const constants = require('./constants');

module.exports = [
  {
    name: constants.PERM_EDIT_GLOBAL,
    default_value: false,
    server_overridable: false
  },
  {
    name: constants.PERM_EDIT_SERVER,
    default_value: false,
    server_owner_default_value: true,
    server_overridable: true,
  }  
]