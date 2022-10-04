const express = require('express');

module.exports = (app) => {
  const protectedRouter = express.Router();

  app.use('/auth', app.routes.auth);
  protectedRouter.use('/users', app.routes.users);
  protectedRouter.use('/accounts', app.routes.accounts);
  protectedRouter.use('/transactions', app.routes.transactions);
  protectedRouter.use('/transfers', app.routes.transfers);
  protectedRouter.use('/balances', app.routes.balances);

  app.use('/v1', app.config.passport.authenticate(), protectedRouter);
};
