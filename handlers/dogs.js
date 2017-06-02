const axios = require('axios');
const { requirePermission, requirePrefix } = require('../handler');
const { DOG_LOOKUP } = require('../permissions/dogs');

const dogs = requirePrefix('!dog')(
  requirePermission(DOG_LOOKUP)((bot, messageInfo) => 
    axios
      .get('https://random.dog/woof.json')
      .then(({ data }) => data.url)
      .then(dogUrl =>
        bot.sendMessage({
          to: messageInfo.channelID,
          message: dogUrl
        })
      )
  )
);

module.exports = dogs;
