module.exports = {
  REQUIRE_CLIP_APPROVAL: {
    name: 'REQUIRE_CLIP_APPROVAL',
    default_value: false,
  },
  MAX_PENDING_CLIPS: {
    name: 'MAX_PENDING_CLIPS',
    type: 'integer',
    default_value: 10,
    server_overridable: false
  }
};
