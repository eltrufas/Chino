const path = require('path');
const fs  = require('fs');
const { requirePermission, requirePrefix } = require('../../handler');
const { pif } = require('../../util');

const { PLAY_CLIP } = require('./constants');

const tokenRegex = /\S+/g;

const clipDir = path.resolve(__dirname, '../../content/clips');

const soundboard = function() {
  const servers = new Map();

  const getServerObject = function(serverID) {
    let obj = servers.get(serverID);
    if (!obj) {
      obj = {
        queue: [],
        playing: false
      };
      servers.set(serverID, obj);
    }

    return obj;
  };

  const clearQueue = function(serverID) {
    servers.delete(serverID);
  };

  const resolveClip = function(bot, clipName, serverID) {
    const { redis } = bot;

    return redis.hgetAsync(
      `shinobu_sound_clips:${serverID}`,
      clipName
    ).then(id => id
      ? redis.hgetAsync(`shinobu_sound_clips`, id)
      : Promise.reject("clip isn't in server")
    ).then(value => value
      ? JSON.parse(value)
      : Promise.reject("Clip doesn't exist")
    );
  };

  const playQueue = function(bot, serverID) {
    shouldPlay(bot, serverID).then(result => result 
      ? playNextFile(bot, serverID)
        .then(stream =>
          stream.once('done', () => playQueue(bot, serverID))
        )
      : getServerObject(serverID).playing = false);
  };

  const playNextFile = function(bot, serverID) {
    const { client } = bot;
    const voiceChannel = bot.currentServerVoice(serverID);

    return Promise.all([
      client.getAudioContextAsync(voiceChannel),
      Promise.resolve(getServerObject(serverID).queue.shift()),
      Promise.resolve(getServerObject(serverID).playing = true)
    ]).then(([ stream, nextFile ]) => {
      fs.createReadStream(nextFile).pipe(stream, {end: false});

      return stream;
    });
  };

  const shouldPlay = function(bot, serverID) {
    const serverObj = getServerObject(serverID);
    return Promise.resolve(serverObj.queue.length > 0 && !serverObj.playing);
  };

  return requirePrefix('.')(requirePermission(PLAY_CLIP)(function(bot, messageInfo) {
    const {userID, channelID, message, rawEvent} = messageInfo;
    const tokens = messageInfo.tokens || message.match(tokenRegex);
    
    console.log(tokens);

    const command = tokens[0];

    if (command === 'join') {
      return bot.joinVoice(bot.resolveUserVoice(userID, channelID));
    } else if (command === 'leave') {
      return bot.leaveServerVoice(bot.serverFromChannelID(channelID));
    }
    
    const serverID = bot.serverFromChannelID(channelID);

    const clipPromise = resolveClip(
      bot,
      command,
      bot.serverFromChannelID(channelID)
    ).then(clip => clip ? Promise.resolve(clip) : Promise.reject('no clipu'));

    const joinPromise = clipPromise
      .then(() => bot.joinVoice(bot.resolveUserVoice(userID, channelID)))
      .then(joined => joined ? clearQueue(bot, serverID) : Promise.resolve());


    clipPromise.then(() => bot.deleteMessage({
      channelID,
      messageID: rawEvent.d.id
    }));

    return Promise.all([clipPromise, joinPromise]).then(([clip]) => {
        const clipPath = path.resolve(clipDir, clip.filename);
        //return bot.redis.lpushAsync(`shinobu_voice_queue:${serverID}`, clipPath);
        return Promise.resolve(getServerObject(serverID).queue.push(clipPath));
      }).then(() => playQueue(bot, serverID));
  }));
};

module.exports = soundboard;
