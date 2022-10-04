const express = require('express');
// const knexLogger = require('knex-logger');

module.exports = (app) => {
  app.use(express.json());

  // mostra no console as consultas feitas no banco
  // app.use(knexLogger(app.knex));
};
