const bcrypt = require('bcrypt-node');
const ValidationError = require('../errors/ValidationError');

module.exports = (app) => {
  const findAll = () => app.knex('users').select(['id', 'name', 'email']);
  const findOne = (filter = {}) => app.knex('users').where(filter).first();

  const getPasswordHash = (password) => {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  };

  const save = async (request) => {
    if (!request.name) throw new ValidationError('nome é um atributo obrigatório');
    if (!request.email) throw new ValidationError('email é um atributo obrigatório');
    if (!request.password) throw new ValidationError('senha é um atributo obrigatório');

    const user = await findOne({ email: request.email });
    if (user) throw new ValidationError('Já existe um usuário com esse email');

    const newUser = { ...request };
    newUser.password = getPasswordHash(request.password);
    return app.knex('users').insert(newUser, ['id', 'name', 'email']);
  };

  return { findAll, save, findOne };
};
