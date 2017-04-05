const Chino = require('./Chino');
const config = require('./config');
const { combineHandlers, tokenize } = require('./handler');
const { compose } = require('./util');
const requireMention = require('./handlers/requireMention');
const settingsManager = require('./handlers/settingsManager');
const soundboard = require('./handlers/soundBoard');
const clipManager = require('./handlers/clipManager');
const filterSelf = require('./handlers/filterSelf');
const booruLookup = require('./handlers/booruLookup');
const buttLookup = require('./handlers/butts');
const catLookup = require('./handlers/cats');
const dogLookup = require('./handlers/dogs');


const regexReaction = require('./handlers/regexReaction');
const permissionManager = require('./handlers/permissionManager');

const app = require('./web/app');

const handler = combineHandlers([
  (bot, { user, message }) => console.log(`${user}: ${message}`),
  compose(filterSelf, requireMention(), tokenize, combineHandlers)([
    settingsManager,
    soundboard,
    clipManager,
    booruLookup,
    buttLookup,
    regexReaction.manager,
    permissionManager,
    catLookup,
    dogLookup
  ]),
  regexReaction.watcher
]);

const chino = new Chino(handler, config);

chino.connect();

app.listen(config.web_port, function() {
  console.log('Web thing listening on port 3000');
});
