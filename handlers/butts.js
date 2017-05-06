const axios = require('axios');
const { requireSetting, requirePrefix } = require('../handler');
const { ALLOW_NSFW_LOOKUP } = require('../settings/butts');

const butts = requirePrefix('!butts')(
  requireSetting(ALLOW_NSFW_LOOKUP)((bot, messageInfo) => 
    axios
      .get('http://api.obutts.ru/butts/0/1/random')
      .then(({ data }) => `http://media.obutts.ru/${data[0].preview}`)
      .then(buttUrl =>
        bot.sendMessage({
          to: messageInfo.channelID,
          message: buttUrl
        })
      )
  )
);

module.exports = butts;
