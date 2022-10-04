const request = require('supertest');
const app = require('../../src/app');

test('Deve inserir usuário via signup', () => {
  return request(app).post('/auth/signup').send({ name: 'John Doe', email: `${Date.now()}@mail.com}`, password: '123456' })
    .then((response) => {
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('John Doe');
      expect(response.body).toHaveProperty('email');
      expect(response.body).not.toHaveProperty('password');
    });
});

test('Deve receber token ao logar', () => {
  const email = `${Date.now()}@mail.com}`;
  return app.services.user.save({ name: 'John Doe', email, password: '123456' })
    .then(() => request(app).post('/auth/signin').send({ email, password: '123456' })
      .then((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
      }));
});

test('Não deve autenticar usuário com senha errada', () => {
  const email = `${Date.now()}@mail.com}`;
  return app.services.user.save({ name: 'John Doe', email, password: '123456' })
    .then(() => request(app).post('/auth/signin').send({ email, password: '654321' }).then((response) => {
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('usuário ou senha inválido');
    }));
});

test('Nao deve autenticar com usuário errado', () => {
  return request(app).post('/auth/signin').send({
    email: 'email@mail.com',
    password: '654321',
  }).then((response) => {
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('usuário ou senha inválido');
  });
});

test('Não deve acessar uma rota protegida sem token', () => {
  return request(app).get('/v1/users').then((response) => {
    expect(response.status).toBe(401);
  });
});
