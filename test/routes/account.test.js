const request = require('supertest');
const jwt = require('jwt-simple');

const app = require('../../src/app');

let user = null;
let userSecond = null;

const secret = '9412831hudausdaisd2193812asdjadaoiw91231lasdkassmcan12';

// executa antes de cada um dos testes, porem é bastante custoso ficar acessando
// o banco de dados antes de cada um dos testes
// beforeEach(async () => {
//     const res = await app.services.user.save({
//     name: 'Account User',
//     email: `${Date.now()}@email.com`,
//     password: '123456' });
//     user = { ...res[0] };
//     user.token = jwt.encode(user, secret);
//     const res2 = await app.services.user.save({
//     name: 'Account User 2',
//     email: `${Date.now()}@email.com`,
//     password: '7890' });
//     user2 = { ...res2[0] };
//     // nao precisa do token do 2° usuário pois nao vamos logar com ele
// });

// Então é melhor executar uma única vez e adaptar o teste que não está sendo possível
// realizar por conta de conflito
beforeAll(async () => {
  const response = await app.services.user.save({ name: 'User Account', email: `${Date.now()}@mail.com`, password: '123456' });
  user = { ...response[0] };
  user.token = jwt.encode(user, secret);
  const responseSecond = await app.services.user.save({ name: 'User Account #2', email: `${Date.now()}@mail.com`, password: '123456' });
  userSecond = { ...responseSecond[0] };
});

test('Deve inserir uma conta com sucesso', () => {
  return request(app).post('/v1/accounts')
    .set('authorization', `bearer ${user.token}`)
    .send({ name: 'Acc #1' })
    .then((response) => {
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Acc #1');
    });
});

test('Não deve inserir uma conta sem nome', () => {
  return request(app).post('/v1/accounts')
    .set('authorization', `bearer ${user.token}`).send({})
    .then((response) => {
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('nome é um atributo obrigatório');
    });
});

test('Deve retornar uma conta por Id', () => {
  return app.knex('accounts').insert({ name: 'Acc By Id', user_id: user.id }, ['id']) // id é o campo que será retornado
    .then((result) => {
      request(app).get(`/v1/accounts/${result[0].id}`)
        .set('authorization', `bearer ${user.token}`)
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.body.name).toBe('Acc By Id');
          expect(response.body.user_id).toBe(user.id);
        });
    });
});

test('Deve alterar uma conta', () => {
  return app.knex('accounts')
    .insert({ name: 'Acc to Update', user_id: user.id }, ['id']) // id é o campo que será retornado
    .then((result) => request(app).put(`/v1/accounts/${result[0].id}`)
      .send({ name: 'Acc Updated' })
      .set('authorization', `bearer ${user.token}`))
    .then((res) => {
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Acc Updated');
    });
});

test('Deve remover uma conta', () => {
  return app.knex('accounts').insert({ name: 'Acc to Delete', user_id: user.id }, ['id']) // id é o campo que será retornado
    .then((result) => {
      request(app).delete(`/v1/accounts/${result[0].id}`)
        .set('authorization', `bearer ${user.token}`)
        .then((response) => {
          expect(response.status).toBe(204);
        });
    });
});

test('Não deve inserir uma conta de nome duplicado, para o mesmo usuário', () => {
  return app.knex('accounts')
    .insert({ name: 'Acc Duplicada', user_id: user.id })
    .then(() => {
      request(app).post('/v1/accounts')
        .set('authorization', `bearer ${user.token}`).send({ name: 'Acc Duplicada' })
        .then((response) => {
          expect(response.status).toBe(400);
          expect(response.body.error).toBe('Já existe uma conta com esse nome');
        });
    });
});

test('Deve listar apenas as contas do usuário', async () => {
  // deletando as informações do banco para não ter conflito de dados
  await app.knex('transactions').del();
  await app.knex('transfers').del();
  await app.knex('accounts').del();
  return app.knex('accounts')
    // inserindo os dois usuários de uma vez
    .insert([
      { name: 'Acc User #1', user_id: user.id },
      { name: 'Acc User #2', user_id: userSecond.id },
    ]).then(() => {
      request(app).get('/v1/accounts')
        .set('authorization', `bearer ${user.token}`)
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.body.length).toBe(1);
          expect(response.body[0].name).toBe('Acc User #1');
        });
    });
});

test('Não deve retornar uma conta de outro usuário', () => {
  // usuário 1 nao pode ver a conta do usuário 2
  return app.knex('accounts')
    .insert({ name: 'Acc User #2', user_id: userSecond.id }, ['id']) // id é o campo que será retornado
    .then((result) => {
      request(app).get(`/v1/accounts/${result[0].id}`)
        .set('authorization', `bearer ${user.token}`)
        .then((response) => {
          // 403 -> está autenticado mas nao tem direito ao recurso
          expect(response.status).toBe(403);
          expect(response.body.error).toBe('Este recurso não pertence ao usuário');
        });
    });
});

test('Não deve alterar uma conta de outro usuário', () => {
  return app.knex('accounts')
    .insert({ name: 'Acc User #2', user_id: userSecond.id }, ['id']) // id é o campo que será retornado
    .then((result) => {
      request(app).put(`/v1/accounts/${result[0].id}`)
        .set('authorization', `bearer ${user.token}`)
        .send({ name: 'Acc Updated' })
        .then((response) => {
          // 403 -> está autenticado mas nao tem direito ao recurso
          expect(response.status).toBe(403);
          expect(response.body.error).toBe('Este recurso não pertence ao usuário');
        });
    });
});

test('Não deve remover uma conta de outro usuário', () => {
  return app.knex('accounts').insert({ name: 'Acc User #2', user_id: userSecond.id }, ['id']) // id é o campo que será retornado
    .then((result) => {
      request(app).delete(`/v1/accounts/${result[0].id}`)
        .set('authorization', `bearer ${user.token}`)
        .then((response) => {
          // 403 -> está autenticado mas nao tem direito ao recurso
          expect(response.status).toBe(403);
          expect(response.body.error).toBe('Este recurso não pertence ao usuário');
        });
    });
});
