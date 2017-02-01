const constants = require('./constants');

module.exports = [
  {
    name: constants.REQUIRE_CLIP_APPROVAL,
    default_value: false,
  },
  {
    name: constants.MAX_PENDING_CLIPS,
    type: 'integer',
    default_value: 10,
    server_overridable: false
  }
];