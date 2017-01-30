const Chino = require('./Chino');
const settings = require('./settings');
const { combineHandlers, tokenize } = require('./handler');
const { compose } = require('./util');
const requireMention = require('./handlers/requireMention');
const settingsManager = require('./handlers/settingsManager');
const soundboard = require('./handlers/soundBoard');
const clipManager = require('./handlers/clipManager');
const filterSelf = require('./handlers/filterSelf');
const booruLookup = require('./handlers/booruLookup');

const app = require('./web/app');

const handler = combineHandlers([
  (bot, {user, message}) => console.log(`${user}: ${message}`),
  compose(filterSelf, requireMention(), tokenize, combineHandlers)([
    settingsManager,
    soundboard(),
    clipManager,
    booruLookup
  ])
]);

const chino = new Chino(handler, settings);

chino.connect();

app.listen(3000, function() {
  console.log('Web thing listening on port 3000');
});
