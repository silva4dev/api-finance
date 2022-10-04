const express = require('express');
const RecursoIndevidoError = require('../errors/RecursoIndevidoError');

module.exports = (app) => {
  const router = express.Router();

  router.param('id', (request, response, next) => {
    app.services.transfer.findOne({ id: request.params.id }).then((result) => {
      if (result.user_id !== request.user.id) throw new RecursoIndevidoError();
      next();
    }).catch((e) => next(e));
  });

  const validate = (request, response, next) => {
    app.services.transfer.validate({ ...request.body, user_id: request.user.id })
      .then(() => next()).catch((e) => next(e));
  };

  router.get('/', (request, response, next) => {
    app.services.transfer.find({ user_id: request.user.id }).then((result) => {
      response.status(200).json(result);
    }).catch((e) => next(e));
  });

  router.post('/', validate, (request, response, next) => {
    const transfer = { ...request.body, user_id: request.user.id };
    app.services.transfer.save(transfer).then((result) => {
      response.status(201).json(result[0]);
    }).catch((e) => next(e));
  });

  router.get('/:id', (request, response, next) => {
    app.services.transfer.findOne({ id: request.params.id }).then((result) => {
      response.status(200).json(result);
    }).catch((e) => next(e));
  });

  router.put('/:id', validate, (request, response, next) => {
    app.services.transfer.update(request.params.id, { ...request.body, user_id: request.user.id })
      .then((result) => {
        response.status(200).json(result[0]);
      }).catch((e) => next(e));
  });

  router.delete('/:id', (request, response, next) => {
    app.services.transfer.remove(request.params.id).then(() => {
      response.status(204).send();
    }).catch((e) => next(e));
  });

  return router;
};
