const ValidationError = require('../errors/ValidationError');

module.exports = (app) => {
  const find = (id, filter = {}) => {
    return app.knex('transactions')
      .join('accounts', 'accounts.id', 'account_id')
      .where(filter)
      .andWhere('accounts.user_id', '=', id)
      .select();
  };

  const findOne = (filter) => {
    return app.knex('transactions').where(filter).first();
  };

  const save = (transaction) => {
    if (!transaction.description) throw new ValidationError('descrição é um atributo obrigatório');
    if (!transaction.ammount) throw new ValidationError('valor é um atributo obrigatório');
    if (!transaction.date) throw new ValidationError('data é um atributo obrigatório');
    if (!transaction.account_id) throw new ValidationError('conta é um atributo obrigatório');
    if (!transaction.type) throw new ValidationError('tipo é um atributo obrigatório');
    if (!(transaction.type === 'I' || transaction.type === 'O')) throw new ValidationError('tipo inválido');

    const newTransaction = { ...transaction };
    if ((transaction.type === 'I' && transaction.ammount < 0) || (transaction.type === 'O' && transaction.ammount > 0)) {
      newTransaction.ammount *= -1;
    }
    return app.knex('transactions').insert(newTransaction, '*');
  };

  const update = (id, transaction) => {
    return app.knex('transactions').where({ id }).update(transaction, '*');
  };

  const remove = (id) => {
    return app.knex('transactions').where({ id }).del();
  };

  return { find, save, findOne, update, remove };
};
