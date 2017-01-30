const request = require('request');

const shortenUrl = (url) => {
  return new Promise((resolve, reject) => {
    return resolve(url);
    request({
      method: 'POST',
      uri: 'http://trfs.me/s/',
      json: {
        'url': url
      }
    }, (err, res, body) => {
      if (err) {
        return reject(err);
      }

      resolve(body['url']);
    });
  });
  
};

module.exports = shortenUrl;