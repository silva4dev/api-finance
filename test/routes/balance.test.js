const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEwMTAwIiwibmFtZSI6IlVzZXIgIzMiLCJlbWFpbCI6InVzZXIzQG1haWwuY29tIn0.BWMBK2xeqxWiX1A3PYCszTJUU4nYaDdhDp1kPQ8fkxA';

const tokenGeral = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEwMTAyIiwibmFtZSI6IlVzZXIgIzUiLCJlbWFpbCI6InVzZXI1QG1haWwuY29tIn0.LgRt5KtkYBUY7LPZqneR6vSzNo6dDpgfu78ynIfGwhU';

beforeAll(async () => {
  await app.knex.seed.run();
});

describe('Ao calcular o saldo do usuário...', () => {
  test('Deve retornar apenas as contas com alguma transação', () => {
    return request(app).get('/v1/balances')
      .set('authorization', `bearer ${token}`)
      .then((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(0);
      });
  });

  test('Deve adicionar valores de entrada', () => {
    return request(app).post('/v1/transactions')
      .send({ description: '1', date: new Date(), ammount: 100, type: 'I', account_id: 10100, status: true })
      .set('authorization', `bearer ${token}`)
      .then(() => {
        return request(app).get('/v1/balances')
          .set('authorization', `bearer ${token}`)
          .then((response) => {
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].id).toBe(10100);
            expect(response.body[0].sum).toBe('100.00');
          });
      });
  });

  test('Deve subtrair valores de saída', () => {
    return request(app).post('/v1/transactions')
      .send({ description: '1', date: new Date(), ammount: 200, type: 'O', account_id: 10100, status: true })
      .set('authorization', `bearer ${token}`)
      .then(() => {
        return request(app).get('/v1/balances')
          .set('authorization', `bearer ${token}`)
          .then((response) => {
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].id).toBe(10100);
            expect(response.body[0].sum).toBe('-100.00');
          });
      });
  });

  test('Não deve considerar transações pendentes', () => {
    return request(app).post('/v1/transactions')
      .send({ description: '1', date: new Date(), ammount: 200, type: 'O', account_id: 10100, status: false })
      .set('authorization', `bearer ${token}`)
      .then(() => {
        return request(app).get('/v1/balances')
          .set('authorization', `bearer ${token}`)
          .then((response) => {
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].id).toBe(10100);
            expect(response.body[0].sum).toBe('-100.00');
          });
      });
  });

  test('Não deve considerar saldo de contas distintas', () => {
    return request(app).post('/v1/transactions')
      .send({ description: '1', date: new Date(), ammount: 50, type: 'I', account_id: 10101, status: true })
      .set('authorization', `bearer ${token}`)
      .then(() => {
        return request(app).get('/v1/balances')
          .set('authorization', `bearer ${token}`)
          .then((response) => {
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].id).toBe(10100);
            expect(response.body[0].sum).toBe('-100.00');
            expect(response.body[1].id).toBe(10101);
            expect(response.body[1].sum).toBe('50.00');
          });
      });
  });

  test('Não deve considerar contas de outros usuários', () => {
    return request(app).post('/v1/transactions')
      .send({ description: '1', date: new Date(), ammount: 200, type: 'O', account_id: 10102, status: true })
      .set('authorization', `bearer ${token}`)
      .then(() => {
        return request(app).get('/v1/balances')
          .set('authorization', `bearer ${token}`)
          .then((response) => {
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].id).toBe(10100);
            expect(response.body[0].sum).toBe('-100.00');
            expect(response.body[1].id).toBe(10101);
            expect(response.body[1].sum).toBe('50.00');
          });
      });
  });

  test('Deve considerar transação passada', () => {
    return request(app).post('/v1/transactions')
      .send({ description: '1', date: moment().subtract({ days: 5 }), ammount: 250, type: 'I', account_id: 10100, status: true })
      .set('authorization', `bearer ${token}`)
      .then(() => {
        return request(app).get('/v1/balances')
          .set('authorization', `bearer ${token}`)
          .then((response) => {
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].id).toBe(10100);
            expect(response.body[0].sum).toBe('150.00');
            expect(response.body[1].id).toBe(10101);
            expect(response.body[1].sum).toBe('50.00');
          });
      });
  });

  test('Não deve considerar transação futura', () => {
    return request(app).post('/v1/transactions')
      .send({ description: '1', date: moment().add({ days: 5 }), ammount: 250, type: 'I', account_id: 10100, status: true })
      .set('authorization', `bearer ${token}`)
      .then(() => {
        return request(app).get('/v1/balances')
          .set('authorization', `bearer ${token}`)
          .then((response) => {
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].id).toBe(10100);
            expect(response.body[0].sum).toBe('150.00');
            expect(response.body[1].id).toBe(10101);
            expect(response.body[1].sum).toBe('50.00');
          });
      });
  });

  test('Deve considerar transferências', () => {
    return request(app).post('/v1/transfers')
      .send({ description: '1', date: new Date(), ammount: 250, account_ori_id: 10100, account_dest_id: 10101 })
      .set('authorization', `bearer ${token}`)
      .then(() => {
        return request(app).get('/v1/balances')
          .set('authorization', `bearer ${token}`)
          .then((response) => {
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].id).toBe(10100);
            expect(response.body[0].sum).toBe('-100.00');
            expect(response.body[1].id).toBe(10101);
            expect(response.body[1].sum).toBe('300.00');
          });
      });
  });
});

test('Deve calcular saldo das contas do usuário', () => {
  return request(app).get('/v1/balances')
    .set('authorization', `bearer ${tokenGeral}`)
    .then((response) => {
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].id).toBe(10104);
      expect(response.body[0].sum).toBe('162.00');
      expect(response.body[1].id).toBe(10105);
      expect(response.body[1].sum).toBe('-248.00');
    });
});
