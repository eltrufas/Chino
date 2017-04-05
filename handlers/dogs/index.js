const axios = require('axios');
const { requirePermission, requirePrefix } = require('../../handler');
const { DOG_LOOKUP } = require('./permissions');

const dogs = requirePrefix('!dog')(
  requirePermission(DOG_LOOKUP)((bot, messageInfo) => 
    axios
      .get('http://random.dog/')
      .then(({ data }) => {
        console.log(data);
        return 'http://random.dog/' + data.match(/src='([^']+)'/)[1];
      })
      .then(dogUrl =>
        bot.sendMessage({
          to: messageInfo.channelID,
          message: dogUrl
        })
      )
  )
);

module.exports = dogs;
