const express = require('express');
const jwt = require('jwt-simple');
const bcrypt = require('bcrypt-node');
const ValidationError = require('../errors/ValidationError');

const secret = '9412831hudausdaisd2193812asdjadaoiw91231lasdkassmcan12';

module.exports = (app) => {
  const router = express.Router();
  router.post('/signin', (request, response, next) => {
    app.services.user.findOne({ email: request.body.email }).then((user) => {
      if (!user) throw new ValidationError('usuário ou senha inválido');
      if (bcrypt.compareSync(request.body.password, user.password)) {
        const payload = {
          id: user.id,
          name: user.name,
          email: user.email,
        };
        const token = jwt.encode(payload, secret);
        response.status(200).json({ token });
      } else {
        throw new ValidationError('usuário ou senha inválido');
      }
    }).catch((e) => next(e));
  });

  router.post('/signup', async (request, response, next) => {
    try {
      const result = await app.services.user.save(request.body);
      return response.status(201).json(result[0]);
    } catch (e) {
      return next(e);
    }
  });

  return router;
};
