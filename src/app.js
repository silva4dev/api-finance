const express = require('express');

const app = express();
const consign = require('consign');
const knex = require('knex');

const knexfile = require('../knexfile');

app.knex = knex(knexfile.test);

consign({ cwd: 'src', verbose: false })
  .include('./config/passport.js')
  .then('./config/middlewares.js')
  .then('./services')
  .then('./routes')
  .then('/config/routes.js')
  .into(app);

app.get('/', (request, response) => {
  response.status(200).send();
});

app.use((err, request, response, next) => {
  const { name, message, stack } = err;
  if (name === 'ValidationError') {
    response.status(400).json({ error: message });
  } else if (name === 'RecursoIndevidoError') {
    response.status(403).json({ error: message });
  } else {
    console.log(message);
    response.status(500).json({ name, message, stack });
  }
  return next(err);
});

module.exports = app;
