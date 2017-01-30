const redis = require('redis');
const async = require('async');

const clips = [
	{
    "name": "tasukete",
    "filename": "dareka.mp3",
    "description": "DAREKA TASUKETE",
    "submitter": "107008565641748480"
  },
  {
    "name": "nico",
    "filename": "nico.mp3",
    "description": "Nico nico ni~",
    "submitter": "107008565641748480"
  },
  {
    "name": 'kimochi',
    "filename": "kimochi.mp3",
    "description": "No lo quite putos",
    "submitter": "107008565641748480"
  },
  {
    "name": "gomenasai",
    "filename": "gomenasai.mp3",
    "description": "Sorry",
    "submitter": "107008565641748480"
  },
  {
    "name": "suteki",
    "filename": "suteki.mp3",
    "description": ":))",
    "submitter": "107008565641748480"
  }
]

const initializeClips = function(clips, callback) {
  const client = redis.createClient();

  client.set("shinobu_last_clip_id", 0, function(err) {
    async.parallel(clips.map(function(clip) {
      return function(callback) {
        client.incr("shinobu_last_clip_id", function(err, id) {
          const value = Object.assign({}, clip, {id});
          client.hset('shinobu_sound_clips', id, JSON.stringify(value), function(err) {
            callback(null, value);
          });
        });
      }
    }), function(err, clips) {
      if (callback) {
        callback(err, clips);
      }
      client.quit();
    });
  });
}

module.exports = initializeClips;
