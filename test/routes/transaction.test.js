const request = require('supertest');
const jwt = require('jwt-simple');
const app = require('../../src/app');

let user = null;
let userSecond = null;
let account = null;
let accountSecond = null;

const secret = '9412831hudausdaisd2193812asdjadaoiw91231lasdkassmcan12';

// irá rodar antes de executar todos os testes
beforeAll(async () => {
  // deletando as informações do banco
  await app.knex('transactions').del();
  await app.knex('transfers').del();
  await app.knex('accounts').del();
  await app.knex('users').del();

  // inserindo os usuários base para o teste
  const users = await app.knex('users').insert([
    { name: 'User #1', email: 'email@mail.com', password: '$2a$10$Ej5XNZPJIDm4PJ.MAkbmC.InGXwkFUXoT7Lw/ADL993phFNd2uj1a' },
    { name: 'User #2', email: 'emailSecond@mail.com', password: '$2a$10$Ej5XNZPJIDm4PJ.MAkbmC.InGXwkFUXoT7Lw/ADL993phFNd2uj1a' },
  ], '*');

  [user, userSecond] = users;

  // gerando uma senha para autenticar
  delete user.password;
  user.token = jwt.encode(user, secret);

  // criando as contas bases para os testes
  const accounts = await app.knex('accounts').insert([
    { name: 'Acc #1', user_id: user.id },
    { name: 'Acc #2', user_id: userSecond.id },
  ], '*');
  [account, accountSecond] = accounts;
});

test('Deve listar apenas as transações do usuário', () => {
  // precisamos ter pelo menos: 2 usuários, 2 contas e 2 transações
  return app.knex('transactions')
    .insert([
      { description: 'T1', date: new Date(), ammount: 100, type: 'I', account_id: account.id },
      { description: 'T2', date: new Date(), ammount: 300, type: 'O', account_id: accountSecond.id },
    ]).then(() => {
      request(app).get('/v1/transactions')
        .set('authorization', `bearer ${user.token}`).then((response) => {
          expect(response.status).toBe(200);
          expect(response.body).toHaveLength(1);
          expect(response.body[0].description).toBe('T1');
        });
    });
});

test('Deve inserir uma transação com sucesso', () => {
  return request(app).post('/v1/transactions')
    .set('authorization', `bearer ${user.token}`)
    .send({ description: 'New T', date: new Date(), ammount: 100, type: 'I', account_id: account.id })
    .then((response) => {
      expect(response.status).toBe(201);
      expect(response.body.account_id).toBe(account.id);
      expect(response.body.ammount).toBe('100.00'); // garantindo que está positivo
    });
});

test('Transações de entrada devem ser positivas', () => {
  return request(app).post('/v1/transactions')
    .set('authorization', `bearer ${user.token}`)
    .send({ description: 'New T', date: new Date(), ammount: -100, type: 'I', account_id: account.id })
    .then((response) => {
      expect(response.status).toBe(201);
      expect(response.body.account_id).toBe(account.id);
      expect(response.body.ammount).toBe('100.00'); // garantindo que está positivo
    });
});

test('Transações de saída devem ser negativas', () => {
  return request(app).post('/v1/transactions')
    .set('authorization', `bearer ${user.token}`)
    .send({ description: 'New T', date: new Date(), ammount: 100, type: 'O', account_id: account.id })
    .then((response) => {
      expect(response.status).toBe(201);
      expect(response.body.account_id).toBe(account.id);
      expect(response.body.ammount).toBe('-100.00'); // garantindo que está negativo
    });
});

// para não ficar muito repetitivo, usamos o describe
describe('Ao tentar inserir uma transação inválida', () => {
  // base e um template que será usado para os próximos testes
  const template = (newData, errorMessage) => {
    return request(app).post('/v1/transactions')
      .set('authorization', `bearer ${user.token}`)
      .send({ description: 'New T', date: new Date(), ammount: 100, type: 'I', account_id: account.id, ...newData })
      .then((response) => {
        expect(response.status).toBe(400);
        expect(response.body.error).toBe(errorMessage);
      });
  };
  test('Não deve inserir sem descrição', () => template({ description: null }, 'descrição é um atributo obrigatório'));
  test('Não deve inserir uma transação sem valor', () => template({ ammount: null }, 'valor é um atributo obrigatório'));
  test('Não deve inserir uma transação sem data', () => template({ date: null }, 'data é um atributo obrigatório'));
  test('Não deve inserir uma transação sem conta', () => template({ account_id: null }, 'conta é um atributo obrigatório'));
  test('Não deve inserir uma transação sem tipo', () => template({ type: null }, 'tipo é um atributo obrigatório'));
  test('Não deve inserir uma transação sem tipo inválido', () => template({ type: 'A' }, 'tipo inválido'));
});

test('Deve retornar uma transação por ID', () => {
  return app.knex('transactions')
    .insert([
      { description: 'T ID', date: new Date(), ammount: 100, type: 'I', account_id: account.id },
    ], ['id']).then((result) => {
      request(app).get(`/v1/transactions/${result[0].id}`)
        .set('authorization', `bearer ${user.token}`)
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.body.id).toBe(result[0].id);
          expect(response.body.description).toBe('T ID');
        });
    });
});

test('Deve alterar uma transação', () => {
  // devemos inserir uma nova transação e alterá-la
  return app.knex('transactions')
    .insert([
      { description: 'to Update', date: new Date(), ammount: 100, type: 'I', account_id: account.id },
    ], ['id']).then((result) => {
      request(app).put(`/v1/transactions/${result[0].id}`)
        .set('authorization', `bearer ${user.token}`)
        .send({ description: 'Updated', date: new Date(), ammount: 100, type: 'I', account_id: account.id })
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.body.id).toBe(result[0].id);
          expect(response.body.description).toBe('Updated');
        });
    });
});

test('Deve remover uma transação', () => {
  // devemos inserir uma nova transação e removê-la
  return app.knex('transactions')
    .insert([
      { description: 'To delete', date: new Date(), ammount: 100, type: 'I', account_id: account.id },
    ], ['id']).then((result) => {
      request(app).delete(`/v1/transactions/${result[0].id}`)
        .set('authorization', `bearer ${user.token}`)
        .then((response) => {
          expect(response.status).toBe(204);
        });
    });
});

test('Não deve remover uma transação de outro usuário', () => {
  // devemos inserir uma nova transação e removê-la a partir de outro usuário
  return app.knex('transactions')
    .insert([
      { description: 'To delete', date: new Date(), ammount: 100, type: 'I', account_id: accountSecond.id },
    ], ['id']).then((result) => {
      request(app).delete(`/v1/transactions/${result[0].id}`)
        .set('authorization', `bearer ${user.token}`)
        .then((response) => {
          expect(response.status).toBe(403);
          expect(response.body.error).toBe('Este recurso não pertence ao usuário');
        });
    });
});

test('Não deve remover conta com transação', () => {
  // precisamos ter uma transação vinculado a uma conta e depois excluímos ela
  return app.knex('transactions')
    .insert([
      { description: 'To delete', date: new Date(), ammount: 100, type: 'I', account_id: account.id },
    ], ['id']).then(() => {
      request(app).delete(`/v1/accounts/${account.id}`)
        .set('authorization', `bearer ${user.token}`)
        .then((response) => {
          expect(response.status).toBe(400);
          expect(response.body.error).toBe('Essa conta possui transações associadas');
        });
    });
});
