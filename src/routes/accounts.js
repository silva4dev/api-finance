const express = require('express');
const RecursoIndevidoError = require('../errors/RecursoIndevidoError');

module.exports = (app) => {
  const router = express.Router();

  router.param('id', (request, response, next) => {
    app.services.account.find({ id: request.params.id }).then((result) => {
      if (result.user_id !== request.user.id) {
        throw new RecursoIndevidoError();
      } else {
        next();
      }
    }).catch((e) => next(e));
  });

  router.post('/', (request, response, next) => {
    app.services.account.save({ ...request.body, user_id: request.user.id }).then((result) => {
      return response.status(201).json(result[0]);
    }).catch((e) => next(e));
  });

  router.get('/', (request, response, next) => {
    app.services.account.findAll(request.user.id).then((result) => {
      response.status(200).json(result);
    }).catch((e) => next(e));
  });

  router.get('/:id', (request, response, next) => {
    app.services.account.find({ id: request.params.id }).then((result) => {
      return response.status(200).json(result);
    }).catch((e) => next(e));
  });

  router.put('/:id', (request, response, next) => {
    app.services.account.update(request.params.id, request.body).then((result) => {
      response.status(200).json(result[0]);
    }).catch((e) => next(e));
  });

  router.delete('/:id', (request, response, next) => {
    app.services.account.remove(request.params.id).then(() => {
      response.status(204).send();
    }).catch((e) => next(e));
  });

  return router;
};
