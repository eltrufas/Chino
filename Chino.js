const { Client } = require('discord.io');
const redis = require('redis');
const path = require('path');
const { readFileSync } = require('fs');
const { DIRECT_MESSAGE } = require('./constants');
const Limiter = require('./Limiter');
const Promise = require('bluebird');

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);
Promise.promisifyAll(Client.prototype);

const setMappedLimiter = function(options) {
  const {
    identifier,
    getKey,
    rate,
    limit,
    handleSingle,
    handleQueue
  } = options;

  const limiters = new Map();

  this[identifier] = function(message) {
    const key = getKey(message);
    let limiter = limiters.get(key);

    if (!limiter) {
      limiter = new Limiter(rate, limit, handleSingle, handleQueue);
      limiters.set(key, limiter);
    }

    return limiter.handle(message);
  };
};

class Chino {
  constructor(handler, options, deps={}) {
    this.client = deps.client || new Client({
      token: options.token
    });

    //patchClient(this.client);

    this.redis = deps.redis || redis.createClient();

    this.options = options;

    this.handler = handler;
    this.serverMessageQueue = new Map();
    this.deleteQueue = new Map();

    this.sendLimiters = new Map();
    this.deleteLimiters = new Map();

    [
      {
        identifier: 'sendMessage',
        rate: 5000,
        limit: 4,
        handleSingle: this.client.sendMessageAsync.bind(this.client),
        getKey: m => m.to
      },
      {
        identifier: 'deleteMessage',
        rate: 5000,
        limit: 4,
        getKey: message => message.channelID,
        handleSingle: this.client.deleteMessageAsync.bind(this.client),
        handleQueue: (messages) => this.client.deleteMessagesAsync({
          channelID: messages[0].channelID,
          messageIDs: messages.map(m => m.messageID)
        })
      },
      {
        identifier: 'editMessage',
        rate: 5000,
        limit: 4,
        getKey: message => message.channelID,
        handleSingle: this.client.editMessageAsync.bind(this.client),
      }
    ].forEach(setMappedLimiter.bind(this));


    this.client.on('ready', () => {
      console.log(this.client.username + ' - (' + this.client.id + ')');
      this.client.editUserInfoAsync({
        username: options.name || 'Shinobu',
        avatar: readFileSync(
          path.resolve(__dirname, './content/pic.png'), 'base64'
        )
      });
    });

    this.client.on('message', (user, userID, channelID, message, rawEvent) => {
      try {
        handler(this, {user, userID, channelID, message, rawEvent});
      } catch (e) {
        console.error(e);
      }
    });
  }

  connect() {
    this.client.connect();
  }

  resolvePermission({userID, channelID}, permission) {
    const { redis, client } = this;
    const serverID = client.channels[channelID]
        ? client.channels[channelID].guild_id
        : DIRECT_MESSAGE;
    
    let ownerPromise;

    if (
      serverID !== DIRECT_MESSAGE &&
      client.servers[serverID].owner_id == userID
    ) {
      ownerPromise = redis.get(`shinobu_perm:${permission}:owner`);
    } else {
      ownerPromise = Promise.resolve(null);
    }

    // rseolve permissions for different scopes. Order matters!
    return Promise.all([
      redis.getAsync(`shinobu_perm:${permission}:global`),
      redis.getAsync(`shinobu_perm:${permission}:${serverID}`),
      redis.getAsync(`shinobu_perm:${permission}:${serverID}:${userID}`),
      ownerPromise,
      redis.getAsync(`shinobu_perm:${permission}:${userID}`),
    ]).then((permissions) => {
      const resolvedPerm = permissions.reduce(function(acc, value) {
        return value !== null ? value : acc;
      }, 'false');

      return JSON.parse(resolvedPerm);
    });
  }

  resolveSetting({channelID}, setting) {
    const { redis } = this;
    const serverID = this.serverFromChannelID(channelID);

    // resolve settings for different scopes. Order matters!
    return Promise.all([
      redis.getAsync(`shinobu_setting:${setting}:global`),
      redis.getAsync(`shinobu_setting:${setting}:${serverID}`),
    ])
    .then(function(settings) {
      const resolvedSetting = settings.reduce(function(acc, value) {
        return value !== null ? value : acc;
      }, false);

      return JSON.parse(resolvedSetting);
    });
  }

  joinVoice(channelID) {
    if (!channelID) {
      console.log('not in voice channel');
      return Promise.reject('not in voice channel');
    }
    const { client } = this;
    const serverID = this.serverFromChannelID(channelID);
    const currentChannel =
      client.servers[serverID].members[client.id].voice_channel_id;

    if (channelID === currentChannel && client._vChannels[currentChannel]) {
        console.log('already here');
        return Promise.resolve(false);
    } else {
      console.log('joining');

      return client.joinVoiceChannelAsync(channelID)
        .then(() => true);
    }
  }

  currentServerVoice(serverID) {
    const { client } = this;
    const currentChannel = 
      client.servers[serverID].members[client.id].voice_channel_id;

    return currentChannel;
  }

  leaveServerVoice(serverID) {
    if (!serverID) {
      return;
    }
    const { client } = this;

    const currentChannel =
      client.servers[serverID].members[client.id].voice_channel_id;

    return client.leaveVoiceChannelAsync(currentChannel);
  }

  resolveUserVoice(userID, channelID) {
    const serverID = this.serverFromChannelID(channelID);
    return this.client.servers[serverID].members[userID].voice_channel_id;
  }

  serverFromChannelID(channelID) {
    const { client } = this;
    return client.channels[channelID]
        ? client.channels[channelID].guild_id
        : DIRECT_MESSAGE;
  }

  simpleSend(text, channelID) {
    return this.sendMessage({
      to: channelID,
      message: text
    });
  }
}

module.exports = Chino;
