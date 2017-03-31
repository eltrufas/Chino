const initializeClips = require('./initializeClips');
const redis = require('redis');
const async = require('async');

const trash = {
seleverga:
{"filename":"seleverga.ogg","description":"perro"},
kritz:
{"filename":"kritz.ogg","description":"Activate charge!"},
tuturu:
{"filename":"tuturu.ogg","description":"tuturu"},
"4u":
{"filename":"4u.ogg","description":"ur a big guy xD"},
harambe:
{"filename":"harambe.ogg","description":""},
gomenasai:
{"filename":"gomenasai.ogg","description":"Sorry"},
gay:
{"filename":"gay.ogg","description":""},
good:
{"filename":"good.ogg","description":"Hey, that's pretty good"},
suteki:
{"filename":"suteki.ogg","description":":))"},
swears:
{"filename":"swears.ogg","description":"Don't say swears"},
tasukete:
{"filename":"dareka.ogg","description":"DAREKA TASUKETE"},
stop:
{"filename":"stop.ogg","description":"This is not okay"},
shitson:
{"filename":"shitson.ogg","description":""},
xfiles:
{"filename":"xfiles.ogg","description":"Illuminati confirmed"},
no:
{"filename":"no.ogg","description":"NO"},
depression:
{"filename":"depression.ogg","description":"I have crippling depression"},
idiot:
{"filename":"idiot.ogg","description":"Pirate shpy"},
nicememe:
{"filename":"nicememe.ogg","description":"Nice meme!"},
mitemite:
{"filename":"mite.ogg","description":"no bully"},
yousoro:
{"filename":"yousoro.ogg","description":""},
gemidos:
{"filename":"gemidos.ogg","description":"No es gracioso"},
viva:
{"filename":"viva.ogg","description":""},
gemi2:
{"filename":"gemi2.ogg","description":"Comedia"},
roasted:
{"filename":"roasted.ogg","description":"My nigga you just go roasted"},
reprobado:
{"filename":"reprobado.ogg","description":"xd"},
turtle:
{"filename":"turtles.ogg","description":"The sounds of turtles"},
quack:
{"filename":"quack.ogg","description":"Aggresive duck"},
kimochi:
{"filename":"kimochi.ogg","description":"No lo quite putos"},
picasso:
{"filename":"picasso.ogg","description":"Mira ham, soy Picasso!"},
doot:
{"filename":"doot.ogg","description":""},
yamete:
{"filename":"yamete.ogg","description":"matate coki"},
pranked:
{"filename":"pranked.ogg","description":"Pranked"},
pimpam:
{"filename":"pimpam.ogg","description":""},
mad:
{"filename":"mad.ogg","description":"Why you heff to be mad?"},
kys:
{"filename":"nadie.ogg","description":":)"},
nico:
{"filename":"nico.ogg","description":"Nico nico ni~"},
stfu:
{"filename":"stfu.ogg","description":""},
nani:
{"filename":"nani.ogg","description":""},
delfin:
{"filename":"delfin.ogg","description":""},
yii:
{"filename":"yii.ogg","description":""}
};

const clips = Object.keys(trash).map(key => (
    Object.assign({}, trash[key], { name: key, "submitter": "107008565641748480" })
));

initializeClips(clips, function(err, clips) {
    const params = clips.map(clip => ([clip.name, clip.id]))
        .reduce((acc, arr) => acc.concat(arr), []);
    
    const client = redis.createClient();

    async.parallel([
        function(callback) {
            client.hmset(['shinobu_sound_clips:122184410769391616'].concat(params), callback);
        },
        function(callback) {
            client.hmset(['shinobu_sound_clips:187010555721154560'].concat(params), callback);
        }     
    ], function() {
        client.quit();
    });
});

