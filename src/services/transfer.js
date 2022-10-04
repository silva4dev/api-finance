const ValidationError = require('../errors/ValidationError');

module.exports = (app) => {
  const find = (filter = {}) => {
    return app.knex('transfers').where(filter).select();
  };

  const findOne = (filter = {}) => {
    return app.knex('transfers').where(filter).first();
  };

  const validate = async (transfer) => {
    if (!transfer.description) throw new ValidationError('descrição é um atributo obrigatório');
    if (!transfer.ammount) throw new ValidationError('valor é um atributo obrigatório');
    if (!transfer.date) throw new ValidationError('data é um atributo obrigatório');
    if (!transfer.account_ori_id) throw new ValidationError('conta de origem é um atributo obrigatório');
    if (!transfer.account_dest_id) throw new ValidationError('conta de destino é um atributo obrigatório');
    if (transfer.account_ori_id === transfer.account_dest_id) throw new ValidationError('não é possível transferir de uma conta para ela mesma');

    const accounts = await app.knex('accounts').whereIn('id', [transfer.account_dest_id, transfer.account_ori_id]);
    accounts.forEach((acc) => {
      if (acc.user_id !== parseInt(transfer.user_id, 10)) throw new ValidationError(`conta #${acc.id} não pertence ao usuário`);
    });
  };

  const save = async (transfer) => {
    const result = await app.knex('transfers').insert(transfer, '*');
    const transferId = result[0].id;
    const transactions = [
      {
        description: `Transfer to acc #${transfer.account_dest_id}`,
        date: transfer.date,
        ammount: transfer.ammount * -1,
        type: 'O',
        account_id: transfer.account_ori_id,
        transfer_id: transferId,
        status: true,
      },
      {
        description: `Transfer from acc #${transfer.account_ori_id}`,
        date: transfer.date,
        ammount: transfer.ammount,
        type: 'I',
        account_id: transfer.account_dest_id,
        transfer_id: transferId,
        status: true,
      },
    ];
    await app.knex('transactions').insert(transactions);
    return result;
  };

  const update = async (id, transfer) => {
    const result = await app.knex('transfers').where({ id }).update(transfer, '*');
    const transactions = [
      {
        description: `Transfer to acc #${transfer.account_dest_id}`,
        date: transfer.date,
        ammount: transfer.ammount * -1,
        type: 'O',
        account_id: transfer.account_ori_id,
        transfer_id: id,
        status: true,
      },
      {
        description: `Transfer from acc #${transfer.account_ori_id}`,
        date: transfer.date,
        ammount: transfer.ammount,
        type: 'I',
        account_id: transfer.account_dest_id,
        transfer_id: id,
        status: true,
      },
    ];
    await app.knex('transactions').where({ transfer_id: id }).del();
    await app.knex('transactions').insert(transactions);
    return result;
  };

  const remove = async (id) => {
    await app.knex('transactions').where({ transfer_id: id }).del();
    return app.knex('transfers').where({ id }).del();
  };

  return { find, save, findOne, update, validate, remove };
};
