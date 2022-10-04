const express = require('express');
const RecursoIndevidoError = require('../errors/RecursoIndevidoError');

module.exports = (app) => {
  const router = express.Router();

  router.param('id', (request, response, next) => {
    app.services.transaction.find(request.user.id, { 'transactions.id': request.params.id }).then((result) => {
      if (result.length > 0) {
        next();
      } else {
        throw new RecursoIndevidoError();
      }
    }).catch((e) => next(e));
  });

  router.get('/', (request, response, next) => {
    app.services.transaction.find(request.user.id).then((result) => {
      response.status(200).json(result);
    }).catch((e) => next(e));
  });

  router.get('/:id', (request, response, next) => {
    app.services.transaction.findOne({ id: request.params.id }).then((result) => {
      response.status(200).json(result);
    }).catch((e) => next(e));
  });

  router.post('/', (request, response, next) => {
    app.services.transaction.save(request.body).then((result) => {
      response.status(201).json(result[0]);
    }).catch((e) => next(e));
  });

  router.put('/:id', (request, response, next) => {
    app.services.transaction.update(request.params.id, request.body).then((result) => {
      response.status(200).json(result[0]);
    }).catch((e) => next(e));
  });

  router.delete('/:id', (request, response, next) => {
    app.services.transaction.remove(request.params.id).then(() => {
      response.status(204).send();
    }).catch((e) => next(e));
  });

  return router;
};
