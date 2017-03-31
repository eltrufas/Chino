const request = require('request');

const DEFAULT_OPTIONS = {
  limit: 100,
  page: 0,
  regex: /file_url=\"(.*?)\"/g,
  base_url: 'http://gelbooru.com',
  extra_args: 'page=dapi&s=post&q=index&',
  endpoint: 'index.php',
  page_arg: 'pid'
};

const createBooruFetcher = function(options) {
  const fullOptions = Object.assign({}, DEFAULT_OPTIONS, options);

  const {
    limit,
    page,
    auth,
    base_url,
    extra_args,
    endpoint,
    page_arg,
    regex,
    prefix_base,
    login,
    key
  } = fullOptions;

  const getRequestURI = function(tags) {
    let uri = `${base_url}/${endpoint}?${extra_args || ''}limit=${limit}&tags=${tags}&${page_arg}=${page}`;
    if (auth) {
      uri += `&login=${login}&api_key=${key}`;
    }

    return uri;
  };

  return function(tagArray) {
    const tags = tagArray.map(encodeURIComponent).join('+');

    const uri = getRequestURI(tags);

    return new Promise((resolve, reject) => {
      request(uri, (err, res, body) => {
        if (err) {
          return reject(err);
        }

        const matches = body.match(regex);

        if (!matches) {
          return resolve([]);
        }

        resolve(
          matches
            .map(match => match.substring(10, match.length - 1))
            .map(url => prefix_base ? base_url + url : url)
        );
      });
    });
  };
};

module.exports = {
  createBooruFetcher
};
