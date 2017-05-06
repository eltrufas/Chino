const redis = require('redis');
const path = require('path');
const fs = require('fs');

const createInitializer = function(type) {
  return function(objects) {
    objects.forEach(function(obj) {
      const client = redis.createClient();

      client.set(`shinobu_${type}:${obj.name}:meta`, JSON.stringify(obj));

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
  };
};

const initializeSettings = createInitializer('setting');

const initializePermissions = createInitializer('perm');

const initializeAll = function() {
  const permDir = path.resolve(__dirname, '../permissions');

  fs.readdir(permDir, (err, filenames) => {
    const perms = filenames.reduce((permissions, filename) => {
      try {
        const permObj = require(path.resolve(permDir, filename));
        const newPerms = Object.keys(permObj).map(key => permObj[key]);
        return permissions.concat(newPerms);
      } catch(e) {
        return permissions;
      }
    }, []);

    initializePermissions(perms);

  });

  const settingDir = path.resolve(__dirname, '../settings');
  fs.readdir(settingDir, (err, filenames) => {
    const sets = filenames.reduce((settings, filename) => {
      try {
        const settingObj = require(path.resolve(__dirname, '../settings', filename));
        const newSettings = Object.keys(settingObj).map(key => settingObj[key]);
        return settings.concat(newSettings);
      } catch(e) {
        return settings;
      }
    }, []);

    console.log(sets);

    initializeSettings(sets);

    const settingDir = path.resolve(__dirname, '../settings');
  });
};

initializeAll();

module.exports = {
  initializeSettings,
  initializePermissions
};
