const request = require('supertest');
const jwt = require('jwt-simple');
const app = require('../../src/app');

let user = null;

const email = `${Date.now()}@mail.com`;
const secret = '9412831hudausdaisd2193812asdjadaoiw91231lasdkassmcan12';

// irá rodar antes de executar todos os testes
beforeAll(async () => {
  const response = await app.services.user.save({ name: 'User Account', email: `${Date.now()}@mail.com`, password: '123456' });
  user = { ...response[0] };
  user.token = jwt.encode(user, secret);
});

test('Deve listar todos os usuários', () => {
  return request(app).get('/v1/users')
    .set('authorization', `bearer ${user.token}`)
    .then((response) => {
      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
    });
});

test('Deve inserir usuário com sucesso', () => {
  return request(app).post('/v1/users')
    .set('authorization', `bearer ${user.token}`)
    .send({ name: 'John Doe', email, password: '123456' })
    .then((response) => {
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('John Doe');
      expect(response.body).not.toHaveProperty('password');
    });
});

test('Deve armazenar senha criptografada', async () => {
  const response = await request(app).post('/v1/users')
    .set('authorization', `bearer ${user.token}`)
    .send({ name: 'John Doe', email: `${Date.now()}@mail.com`, password: '123456' });
  expect(response.status).toBe(201);
  const { id } = response.body;
  const result = await app.services.user.findOne({ id });
  expect(result.password).not.toBeUndefined();
  expect(result.password).not.toBe('123456');
});

test('Não deve inserir usuário sem nome', () => {
  return request(app).post('/v1/users')
    .set('authorization', `bearer ${user.token}`)
    .send({ email: 'johndoe@mail.com', password: '123456' })
    .then((response) => {
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('nome é um atributo obrigatório');
    });
});

test('Não deve inserir usuário sem email', async () => {
  const result = await request(app).post('/v1/users')
    .set('authorization', `bearer ${user.token}`)
    .send({ name: 'John Doe', password: '123456' });
  expect(result.status).toBe(400);
  expect(result.body.error).toBe('email é um atributo obrigatório');
});

test('Não deve inserir usuário sem senha', (done) => {
  request(app).post('/v1/users')
    .set('authorization', `bearer ${user.token}`)
    .send({ name: 'John Doe', email: 'johndoe@mail.com' })
    .then((response) => {
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('senha é um atributo obrigatório');
      done();
    })
    .catch((err) => done.fail(err));
});

test('Não deve inserir usuário com email existente', () => {
  return request(app).post('/v1/users')
    .set('authorization', `bearer ${user.token}`)
    .send({ name: 'John Doe', email, password: '123456' })
    .then((response) => {
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Já existe um usuário com esse email');
    });
});
