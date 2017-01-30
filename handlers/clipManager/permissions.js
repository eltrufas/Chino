const constants = require('./constants');

module.exports = [
  {
    name: constants.ADD_CLIP,
    default_value: false,
    server_owner_default_value: true,
    server_overridable: true
  },
  {
    name: constants.SUBMIT_CLIP,
    default_value: true,
  }
]