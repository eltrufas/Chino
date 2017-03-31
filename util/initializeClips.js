const redis = require('redis');
const async = require('async');

const initializeClips = function(clips, callback) {
  const client = redis.createClient();

  client.set("shinobu_last_clip_id", 0, function() {
    async.parallel(clips.map(function(clip) {
      return function(callback) {
        client.incr("shinobu_last_clip_id", function(err, id) {
          const value = Object.assign({}, clip, {id});
          client.hset(
            'shinobu_sound_clips',
            id,
            JSON.stringify(value),
            function() {
              callback(null, value);
            }
          );
        });
      };
    }), function(err, clips) {
      if (callback) {
        callback(err, clips);
      }
      client.quit();
    });
  });
};

module.exports = initializeClips;
