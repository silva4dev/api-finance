const express = require('express');

module.exports = (app) => {
  const router = express.Router();

  router.get('/', (request, response, next) => {
    app.services.user.findAll().then((result) => {
      response.status(200).json(result);
    }).catch((e) => next(e));
  });

  router.post('/', async (request, response, next) => {
    try {
      const result = await app.services.user.save(request.body);
      return response.status(201).json(result[0]);
    } catch (e) {
      return next(e);
    }
  });

  return router;
};
