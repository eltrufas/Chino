const path = require('path');
const fs = require('fs');
const {
  requirePermission,
  requirePrefix,
  splitCommands
} = require('../handler');

const { PLAY_CLIP } = require('../permissions/soundboard');

const clipDir = path.resolve(__dirname, '../content/clips');

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

  return redis
    .hgetAsync(`shinobu_sound_clips:${serverID}`, clipName)
    .then(
      id =>
        id
          ? redis.hgetAsync(`shinobu_sound_clips`, id)
          : Promise.reject("clip isn't in server")
    )
    .then(
      value => value ? JSON.parse(value) : Promise.reject("Clip doesn't exist")
    );
};

const resetTimeout = function(bot, serverID) {
  const server = getServerObject(serverID);

  if (server.timeout) {
    clearTimeout(server.timeout);
  }

  server.timeout = setTimeout(() => leaveVoiceChannel(bot, serverID), 60000);
};

const playQueue = function(bot, serverID) {
  shouldPlay(bot, serverID).then(
    result =>
      result
        ? playNextFile(bot, serverID).then(stream =>
            stream.once('done', () => {
              resetTimeout(bot, serverID);
              return playQueue(bot, serverID);
            }))
        : (getServerObject(serverID).playing = false)
  );
};

const playNextFile = function(bot, serverID) {
  const { client } = bot;
  const voiceChannel = bot.currentServerVoice(serverID);

  return Promise.all([
    client.getAudioContextAsync(voiceChannel),
    Promise.resolve(getServerObject(serverID).queue.shift()),
    Promise.resolve((getServerObject(serverID).playing = true))
  ]).then(([stream, nextFile]) => {
    fs.createReadStream(nextFile).pipe(stream, { end: false });

    return stream;
  });
};

const shouldPlay = function(bot, serverID) {
  const serverObj = getServerObject(serverID);
  return Promise.resolve(serverObj.queue.length > 0 && !serverObj.playing);
};

const leaveVoiceChannel = function(bot, serverID) {
  clearQueue(serverID);

  return bot.leaveServerVoice(serverID);
}

const handleJoin = function(bot, messageInfo) {
  const { userID, channelID } = messageInfo;

  return bot.joinVoice(bot.resolveUserVoice(userID, channelID));
};

const handleLeave = function(bot, messageInfo) {
  const { channelID } = messageInfo;
  const serverID = bot.serverFromChannelID(channelID);

  return leaveVoiceChannel(bot, serverID);
};

const handlePlay = function(bot, messageInfo, tokens) {
  const { channelID, rawEvent, userID } = messageInfo;

  const serverID = bot.serverFromChannelID(channelID);

  const clipPromise = resolveClip(
    bot,
    tokens[0],
    bot.serverFromChannelID(channelID)
  ).then(clip => clip ? Promise.resolve(clip) : Promise.reject('no clipu'));

  const joinPromise = clipPromise
    .then(() => bot.joinVoice(bot.resolveUserVoice(userID, channelID)))
    .then(joined => joined ? clearQueue(bot, serverID) : Promise.resolve());

  clipPromise.then(() =>
    bot.deleteMessage({
      channelID,
      messageID: rawEvent.d.id
    }));

  return Promise.all([clipPromise, joinPromise])
    .then(([clip]) => {
      const clipPath = path.resolve(clipDir, clip.filename);

      return Promise.resolve(getServerObject(serverID).queue.push(clipPath));
    })
    .then(() => playQueue(bot, serverID));
};

const handlers = {
  join: handleJoin,
  leave: handleLeave
};

const soundboard = requirePrefix('.')(
  requirePermission(PLAY_CLIP)(splitCommands(handlers, handlePlay))
);

module.exports = soundboard;
