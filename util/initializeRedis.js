const redis = require('redis');
const path = require('path');
const fs = require('fs');

const createInitializer = function(type) {
  return function(objects) {
    objects.forEach(function(obj) {
      const client = redis.createClient();

      client.set(
        `shinobu_${type}:${obj.name}:meta`,
        JSON.stringify(obj)
      );

      client.set(
        `shinobu_${type}:${obj.name}:global`,
        JSON.stringify(obj.default_value)
      );

      if (obj.server_owner_default_value !== undefined) {
        client.set(
          `shinobu_${type}:${obj.name}:owner`,
          JSON.stringify(obj.server_owner_default_value)
        );
      }

      client.quit();
    });
  }
}

const initializeSettings = createInitializer('setting');

const initializePermissions = createInitializer('perm');

const initializeAll = function() {
  const handlerDir = path.resolve(__dirname, '../handlers');
  fs.readdir(handlerDir, function(err, dirs) {
    const { permissions, settings } = dirs
      .reduce(function({ settings, permissions }, dir) {
        try {
          const permObj = require(
            path.resolve(handlerDir, dir, 'permissions')
          );
          const newPerms = Object.keys(permObj)
            .map(key => permObj[key]);
          console.log(dir, newPerms);
          permissions = permissions.concat(newPerms);
        } catch(e) {}

        try {
          const settingsObj = require(
            path.resolve(handlerDir, dir, 'settings')
          );
          const newSettings = Object.keys(settingsObj)
            .map(key => settingsObj[key]);
          console.log(dir, newSettings);
          settings = settings.concat(newSettings);
        } catch(e) {}

        return {settings, permissions};
      }, {permissions: [], settings: []});

    console.log(permissions, settings);
    initializePermissions(permissions);
    initializeSettings(settings);
  })
}

initializeAll();

module.exports = {
  initializeSettings,
  initializePermissions
}
