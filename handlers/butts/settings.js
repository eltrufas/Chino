const constants = require('./constants');

module.exports = [
  {
    name: constants.ALLOW_NSFW_LOOKUP,
    type: 'boolean',
    default_value: false,
    server_overridable: true
  }
];