const { createBooruFetcher } = require('./booru');
const { mention } = require('../../util');
const { requirePrefix } = require('../../handler');
const shortenUrl = require('./shortenUrl');
const tokenRegex = /\S+/g;

const RATING_TAGS = [
  'rating:explicit',
  'rating:questionable',
  'rating:safe',
  '-rating:explicit',
  '-rating:questionable',
  '-rating:safe'
];

const tagComplement = tag => tag.startsWith('-') ? tag.substr(1) :`-${string}`

const createLookupHandler = function(sfw, options={}) {
  const defaultRatingTags = sfw ? 'rating:safe' : '-rating:safe';

  const fetcher = createBooruFetcher(options);

  const addRatingTags = tags => tags.some(tag => RATING_TAGS.indexOf(tag) > -1)
      ? tags
      : tags.concat([defaultRatingTags]);

  const resolveTags = (tags, blockedTags) =>
    addRatingTags(tags.filter(Boolean).map(tag => tag.toLowerCase()))
      .concat(blockedTags.map(tagComplement));


  return function(bot, messageInfo) {
    const userTags = messageInfo.tokens;
    const serverID = bot.serverFromChannelID(messageInfo.channelID);

    const tagPromise = bot.redis.smembersAsync(
      `shinobu_blocked_booru_tags:${serverID}`
    )
    .then(blockedTags => {
      if (userTags.some(tag => blockedTags.indexOf(tag) > -1)) {
        return Promise.reject('Blocked tag detected');
      }

      return resolveTags(userTags, blockedTags);
    });

    const messagePromise = tagPromise.then(tags =>
      bot.sendMessage({
        to: messageInfo.channelID,
        embed: {
          title: "Waifu lookup",
          description: `**Searching with tags:** ${tags.join(', ')}.`
        }
      }));

    const urlPromise = tagPromise.then(fetcher).then(results => {
      if (results.length === 0) {
        return Promise.reject('No results found');
      }

      return results[Math.floor(Math.random() * results.length)];
    }).then(shortenUrl);

    return Promise.all([
      urlPromise,
      messagePromise,
      tagPromise
    ]).then(([url, message, tags]) => 
      bot.editMessage({
        channelID: messageInfo.channelID,
        messageID: message.id,
        embed: {
          title: 'Waifu lookup',
          description: `**Result found for tags** ${tags.join(', ')}.`,
          color: 0x6DEB60,
          url,
          image: {
            url
          },
          provider: {
            name: 'Gelbooru',
            url: 'http://gelbooru.com/'
          }
        }
      })
    )
      
    .catch(reason => {
      if (reason === 'Blocked tag detected') {
        return bot.sendMessage({
          to: messageInfo.channelID,
          message: `${mention(messageInfo.userID)} Blocked tag detected`
        });
      } else if (reason === 'No results found') {
        if (!messagePromise.isRejected() && !tagPromise.isRejected()) {
          return Promise.all([messagePromise, tagPromise])
          .then(([message, tags]) => 
            bot.editMessage({
              channelID: messageInfo.channelID,
              messageID: message.id,
              embed: {
                title: 'Waifu lookup',
                description: `**No results found for tags** ${tags.join(', ')}.`,
                color: 0xFF530D
              }
            })
          )
        }
      } else {
        return Promise.reject(reason);
      }
    });
  };
};

const handleLookup = createLookupHandler(true);

const handlers = {
  nsfw: createLookupHandler(false)
};

const booruLookup = requirePrefix('!qt')(function(bot, messageInfo) {
	const tokens = messageInfo.tokens || messageInfo.message.match(tokenRegex);
	const [ command, ...rest ] = tokens;

  if (handlers.hasOwnProperty(command)) {
    const newMessageInfo = Object.assign({}, messageInfo, { tokens: rest });

    return handlers[command](bot, newMessageInfo);
  } else {
    const newMessageInfo = Object.assign(
      {},
      messageInfo,
      { tokens: rest.concat([command]) }
    );
    
    return handleLookup(bot, newMessageInfo);
  }
});

module.exports = booruLookup;
