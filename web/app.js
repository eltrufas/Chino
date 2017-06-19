const express = require('express');
const redis = require('redis');
const Promise = require('bluebird');
const path = require('path');

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

const client = redis.createClient();
const app = express();

const row = ({submitter, name, id, preview}) => `
<tr>
  <td>${id}</td>
  <td>${name}</td>
  <td>${submitter}</td>
  <td><a href="${preview}">Preview</a></td>
</tr>`;

const list = rows => `
<!DOCTYPE html>
<html lang="en">
    <head>
        <title>clips</title>
        <meta charset="UTF-8">
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Clip ID</th>
            <th>Default clip name</th>
            <th>Submitter ID</th>
            <th>Clip preview</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>
    </body>
</html>
`;

app.get('/clips/', function(req, res) {
  client.hgetallAsync('shinobu_sound_clips').then(results => {
    const rows = Object.keys(results).map(key => {
      const { submitter, name, id } = JSON.parse(results[key]);

      const preview = `clip_file/${id}`;

      return row({
        submitter, name, id, preview
      });
    });

    res.send(list(rows));
  });
});

app.get('/clip_file/:id', function(req, res) {
  client.hgetAsync('shinobu_sound_clips', req.params.id).then(clip => {
    if (!clip) {
      return res.status(404).send("Clip doesn't exist!");
    }

    const clipObj = JSON.parse(clip);

    res.sendFile(path.resolve(
      __dirname,
      `../content/clips/${clipObj.filename}`
    ));
  });
});

module.exports = app;
