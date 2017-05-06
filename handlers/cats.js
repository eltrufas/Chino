const axios = require('axios');
const { requirePermission, requirePrefix } = require('../handler');
const { CAT_LOOKUP } = require('../permissions/cats');

const cats = requirePrefix('!cat')(
  requirePermission(CAT_LOOKUP)((bot, messageInfo) => 
    axios
      .get('http://random.cat/meow')
      .then(({ data }) => data.file)
      .then(catUrl =>
        bot.sendMessage({
          to: messageInfo.channelID,
          message: catUrl
        })
      )
  )
);

module.exports = cats;
