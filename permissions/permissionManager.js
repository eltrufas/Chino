module.exports = {
  SET_GLOBAL_PERM: {
    name: 'SET_GLOBAL_PERM',
    default_value: false,
    server_overridable: false
  },
  SET_SERVER_PERM: {
    name: 'SET_SERVER_PERM',
    default_value: false,
    server_owner_default_value: true,
    server_overridable: true
  }
};
