const axios = require('axios');
const { requirePrefix } = require('../handler');

const pte = requirePrefix('!pte')((bot, messageInfo) =>
  axios
    .get('http://pte.trfs.me/random')
    .then(({ data }) =>
      bot.sendMessage({
        to: messageInfo.channelID,
        message: data
      })
    )
);

module.exports = pte;
