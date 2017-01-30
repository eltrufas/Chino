const tokenRegex = /\S+/g;
const redis = require('redis');
const path = require('path');
const { spawn } = require('child_process');
var Promise = require('bluebird');
const request = Promise.promisifyAll(require('request'));

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

const clipDir = path.resolve(__dirname, '../../content/clips');
const { requirePermission, requirePrefix } = require('../../handler');

const { REQUIRE_CLIP_APPROVAL, SUBMIT_CLIP, MANAGE_CLIPS, MAX_PENDING_CLIPS } = require('./constants');


const addClip = function(clipID, serverID, name) {
  const redis = this.redis || redis.createClient();

  const clipPromise = redis.hgetAsync('shinobu_sound_clips', clipID)
    .then(JSON.parse);
  
  const savePromise = clipPromise.then(clip => {
    if (clip === null) {
      return Promise.reject('Clip does not exist');
    }

    name = JSON.stringify(name) || clip.name;

    return redis.hset(`shinobu_sound_clips:${serverID}`, name, clipID);
  });

  return Promise.all([clipPromise, savePromise])
    .then(([clip]) => clip);
};


const createClipObject = function(name, url, submitter) {
	const redis = this.redis || redis.createClient();

	//const extension = path.extname(url);

	console.log(name, url, submitter);

	const idPromise = redis.incrAsync('shinobu_last_clip_id');

	const filePromise = idPromise.then(id => {
		const filename = `${id}.ogg`;
		//const file = fs.createWriteStream(path.join(clipDir, filename));
		
		console.log(path.join(clipDir, filename));

		const ffmpeg = spawn('ffmpeg' , [ //Or 'avconv', if you have it instead
			'-i', 'pipe:0',
			'-codec:a', 'libvorbis',
			path.join(clipDir, filename)
		], {stdio: ['pipe', 'pipe', 'ignore']});

		return { ffmpeg, filename };
	});



	const requestPromise = filePromise.then(({ ffmpeg }) => 
      new Promise((resolve, reject) => {
        request.get(url).pipe(ffmpeg.stdin)
          .on('error', (error) => {
            reject(error);
          });

        ffmpeg.on('exit', resolve);
      }));

	return Promise.all([
		idPromise, filePromise, requestPromise
	]).then(([id, {filename}]) => ({
    id, name, submitter, filename
	}));
};


const submitClip = function(submitter, name, url) {
	this.redis = this.redis || redis.createClient();

	const clipPromise = createClipObject.call(this, name, url, submitter);

	clipPromise.then(clip => this.redis.hset(`shinobu_sound_clips`, clip.id, JSON.stringify(clip)));

	return clipPromise;		
};


const submitClipForApproval = function(submitter, name, url) {
	this.redis = this.redis || redis.createClient();

	return Promise.all([
		this.resolveSetting({}, MAX_PENDING_CLIPS),
		this.redis.hlenAsync(`shinobu_sound_clips:${submitter}`)
	]).then(([maxLen, userLen]) => {
		if (userLen >= maxLen) {
			return Promise.reject('queue is full');
		} else {
			return createClipObject.call(this, submitter, name, url);
		}
	}).then(clip => this.redis.hset(`shinobu_sound_clips:${submitter}`, clip.id, JSON.stringify(clip)));
};


const handleSubmit = requirePermission(SUBMIT_CLIP)(function(bot, messageInfo) {
	const { tokens } = messageInfo;

	console.log(tokens);

	if (tokens.length < 2) {
		return;
	}

	const [ name, url ] = tokens;

	const settingPromise = bot.resolveSetting(messageInfo, REQUIRE_CLIP_APPROVAL);

	const submitPromise = settingPromise.then((required) => (
		required
			? submitClipForApproval.call(this, messageInfo.userID, name, url)
			: submitClip.call(this, messageInfo.userID, name, url)));

	return Promise.all([settingPromise, submitPromise])
		.then(([approvalRequired, clip]) => {
			bot.sendMessage({
				to: messageInfo.channelID,
				message: `Submitted clip ${name} with id ${clip.id} ${approvalRequired ? " for approval" : ""}.`
			});
		});
});


const handleAdd = requirePermission(MANAGE_CLIPS)(function(bot, messageInfo) {
  const { tokens } = messageInfo;

	if (tokens.length < 1) {
		return;
	}

	const [ id, name ] = tokens;

	if (isNaN(id)) {
		return;
	}

  return addClip.call(bot, id, bot.serverFromChannelID(messageInfo.channelID), name)
    .then(clip => bot.sendMessage({
      to: messageInfo.channelID,
      message: `Added clip ${id} under name ${clip.name}`
    }));
});


const handleAddMultiple = requirePermission(MANAGE_CLIPS)(function(bot, messageInfo) {
  const { tokens, channelID } = messageInfo;

  if (tokens.length < 1) {
    return;
  }

  const serverID = bot.serverFromChannelID(channelID);

  return Promise.all(tokens.map(id => addClip.call(bot, id, serverID))).then(clips => {
    const clipStrings = clips.map(clip => `${clip.name}(${clip.id})`);

    return bot.sendMessage({
      to: messageInfo.channelID,
      message: `Added clips: ${clipStrings.join(', ')}`
    });
  });
});


const handleList = function(bot, messageInfo) {
  const serverID = bot.serverFromChannelID(messageInfo.channelID);

  return bot.redis.hgetallAsync(`shinobu_sound_clips:${serverID}`)
    .then(result => {
      const clipStrings = Object.keys(result).map(name => `${name}(${result[name]})`);

      const message = `**Clips on this server**: ${clipStrings.join(', ')}`;

      return bot.sendMessage({
        to: messageInfo.channelID,
        message
      });
    });
};


const handlers = {
  submit: handleSubmit,
  add: handleAdd,
  addm: handleAddMultiple,
  list: handleList
};


const clipManager = requirePrefix('!clip')(function(bot, messageInfo) {
	const tokens = messageInfo.tokens || messageInfo.message.match(tokenRegex);
	const [  command, ...rest ] = tokens;

	const newMessageInfo = Object.assign({}, messageInfo, { tokens: rest });

	if (handlers.hasOwnProperty(command)) {
		return handlers[command](bot, newMessageInfo);
	}

  return Promise.resolve('noop');
});


module.exports = clipManager;
