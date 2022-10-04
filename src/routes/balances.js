const express = require('express');

module.exports = (app) => {
  const router = express.Router();

  router.get('/', (request, response, next) => {
    app.services.balance.getSaldo(request.user.id).then((result) => {
      response.status(200).json(result);
    }).catch((e) => next(e));
  });

  return router;
};
