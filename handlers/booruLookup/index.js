const { createBooruFetcher } = require('./booru');
const { mention } = require('../../util');
const {
  requirePrefix,
  requirePermission,
  splitCommands
} = require('../../handler');
const Promise = require('bluebird');
const { BOORU_MAX_SAVE_CODE } = require('../../settings/booruLookup');
const {
  BOORU_MODIFY_BLOCKED_TAGS,
  BOORU_SAVE_PICTURE,
  BOORU_LOOKUP
} = require('../../permissions/booruLookup');

const RATING_TAGS = [
  'rating:explicit',
  'rating:questionable',
  'rating:safe',
  '-rating:explicit',
  '-rating:questionable',
  '-rating:safe'
];

const tagComplement = tag => tag.startsWith('-') ? tag.substr(1) : `-${tag}`;

const pushSaveCode = function(bot, channelID, url) {
  const { redis } = bot;

  return Promise.all([
    bot.resolveSetting({ channelID }, BOORU_MAX_SAVE_CODE),
    redis.hincrbyAsync(`shinobu_booru_next_save_codes`, channelID, 1)
  ]).then(([maxSaveCode, nextSaveCode]) => {
    const resetPromise = nextSaveCode === maxSaveCode
      ? redis.hsetAsync(`shinobu_booru_next_save_codes`, channelID, 0)
      : Promise.resolve();

    const setPromise = redis.hsetAsync(
      `shinobu_booru_save_codes:${channelID}`,
      nextSaveCode,
      url
    );

    return Promise.all([setPromise, resetPromise]).then(() => nextSaveCode);
  });
};

const createLookupHandler = function(sfw, options = {}) {
  const defaultRatingTags = sfw ? 'rating:safe' : '-rating:safe';

  const fetcher = createBooruFetcher(options);

  const addRatingTags = tags =>
    tags.some(tag => RATING_TAGS.indexOf(tag) > -1)
      ? tags
      : tags.concat([defaultRatingTags]);

  const resolveTags = (tags, blockedTags) =>
    addRatingTags(tags.filter(Boolean).map(tag => tag.toLowerCase())).concat(
      blockedTags.map(tagComplement)
    );

  return function(bot, messageInfo, tokens) {
    console.log(tokens);
    const userTags = tokens;
    const serverID = bot.serverFromChannelID(messageInfo.channelID);

    const tagPromise = bot.redis
      .smembersAsync(`shinobu_blocked_booru_tags:${serverID}`)
      .then(blockedTags => 
        userTags.some(tag => blockedTags.indexOf(tag) > -1)
          ? Promise.reject('Blocked tag detected')
          : resolveTags(userTags, blockedTags)
      );

    const messagePromise = tagPromise.then(tags =>
      bot.sendMessage({
        to: messageInfo.channelID,
        message: `**Search for tags:** ${tags.join(', ')}.`
      }));

    const urlPromise = tagPromise.then(fetcher).then(results => 
      results.length === 0
        ? Promise.reject('No results found')
        : 'https:' + results[Math.floor(Math.random() * results.length)]
    );

    const saveCodePromise = urlPromise.then(url =>
      pushSaveCode(bot, messageInfo.channelID, url));

    return Promise.all([
      urlPromise,
      messagePromise,
      tagPromise,
      saveCodePromise
    ])
      .then(([url, message, tags, saveCode]) => {
        const deletePromise = bot.deleteMessage({
          channelID: messageInfo.channelID,
          messageID: message.id
        });

        const sendPromise = bot.sendMessage({
          to: messageInfo.channelID,
          message: mention(messageInfo.userID),
          embed: {
            title: `**Result found for tags:** ${tags.join(', ')}.`,
            description: `Send \`!qt save ${saveCode}\` to save this picture.`,
            color: 0x6deb60,
            url,
            image: {
              url
            },
            provider: {
              name: 'Gelbooru',
              url: 'http://gelbooru.com/'
            }
          }
        });

        return Promise.all([deletePromise, sendPromise]);
      })
      .catch(reason => {
        if (reason === 'Blocked tag detected') {
          return bot.sendMessage({
            to: messageInfo.channelID,
            message: `${mention(messageInfo.userID)} Blocked tag detected`
          });
        } else if (reason === 'No results found') {
          if (!messagePromise.isRejected() && !tagPromise.isRejected()) {
            return Promise.all([messagePromise, tagPromise]).then(([, tags]) =>
              bot.sendMessage({
                to: messageInfo.channelID,
                message: `**No results found for tags:** ${tags.join(', ')}.`
              }));
          }
        } else {
          return Promise.reject(reason);
        }
      });
  };
};

const handleSave = function(bot, messageInfo, tokens) {
  const { channelID } = messageInfo;

  if (tokens.length != 1) {
    return Promise.resolve(false);
  }

  const id = Number(tokens[0]);

  if (isNaN(id)) {
    return Promise.resolve(false);
  }

  const { redis } = bot;
  const serverID = bot.serverFromChannelID(channelID);

  const urlPromise = redis.hgetAsync(
    `shinobu_booru_save_codes:${channelID}`,
    id
  );

  urlPromise.then(() =>
    redis.hdelAsync(`shinobu_booru_save_codes:${channelID}`, id));

  const savePromise = urlPromise.then(url =>
    redis.saddAsync(`shinobu_booru_saved_images:${serverID}`, url));

  return Promise.all([urlPromise, savePromise]).then(() =>
    bot.sendMessage({
      to: channelID,
      message: 'Image url saved. Use `!qt saved` to pull up a random saved picture'
    }));
};

const handleSaved = function(bot, messageInfo) {
  const { redis } = bot;
  const { channelID } = messageInfo;
  const serverID = bot.serverFromChannelID(channelID);

  return redis
    .srandmemberAsync(`shinobu_booru_saved_images:${serverID}`)
    .then(url =>
      bot.sendMessage({
        to: channelID,
        message: mention(messageInfo.userID),
        embed: {
          title: `Saved picture`,
          color: 0x6deb60,
          url,
          image: {
            url
          },
          provider: {
            name: 'Gelbooru',
            url: 'http://gelbooru.com/'
          }
        }
      }));
};

const handleBlock = function(bot, messageInfo, tokens) {
  const tags = tokens.map(encodeURIComponent);

  if (!tags.length) {
    return Promise.resolve('noop');
  }

  const serverID = bot.serverFromChannelID(messageInfo.channelID);

  return bot.redis.saddAsync
    .apply(bot.redis, [`shinobu_blocked_booru_tags:${serverID}`].concat(tags))
    .then(() =>
      bot.sendMessage({
        to: messageInfo.channelID,
        message: `**Blocked tags:** ${tags.join(', ')}.`
      }));
};

const handleAllow = function(bot, messageInfo, tokens) {
  const tags = tokens.map(encodeURIComponent);

  if (!tags.length) {
    return Promise.resolve('noop');
  }

  const serverID = bot.serverFromChannelID(messageInfo.channelID);

  return bot.redis.sremAsync
    .apply(bot.redis, [`shinobu_blocked_booru_tags:${serverID}`].concat(tags))
    .then(() =>
      bot.sendMessage({
        to: messageInfo.channelID,
        message: `**Allowed tags:** ${tags.join(', ')}.`
      }));
};

const handleLookup = requirePermission(BOORU_LOOKUP)(createLookupHandler(true));

const handlers = {
  nsfw: requirePermission(BOORU_LOOKUP)(createLookupHandler(false)),
  saved: requirePermission(BOORU_LOOKUP)(handleSaved),
  block: requirePermission(BOORU_MODIFY_BLOCKED_TAGS)(handleBlock),
  allow: requirePermission(BOORU_MODIFY_BLOCKED_TAGS)(handleAllow),
  save: requirePermission(BOORU_SAVE_PICTURE)(handleSave)
};

const booruLookup = requirePrefix('!qt')(splitCommands(handlers, handleLookup));

module.exports = booruLookup;
