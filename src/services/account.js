const ValidationError = require('../errors/ValidationError');

module.exports = (app) => {
  const findAll = (id) => app.knex('accounts').where({ user_id: id });
  const find = (filter = {}) => app.knex('accounts').where(filter).first();

  const save = async (request) => {
    if (!request.name) throw new ValidationError('nome é um atributo obrigatório');
    const account = await find({ name: request.name, user_id: request.user_id });
    if (account) throw new ValidationError('Já existe uma conta com esse nome');
    return app.knex('accounts').insert(request, '*');
  };

  const update = (id, request) => app.knex('accounts').where({ id }).update(request, '*');

  const remove = async (id) => {
    const transaction = await app.services.transaction.findOne({ account_id: id });
    if (transaction) throw new ValidationError('Essa conta possui transações associadas');
    return app.knex('accounts').where({ id }).del('*');
  };

  return { save, findAll, find, update, remove };
};
