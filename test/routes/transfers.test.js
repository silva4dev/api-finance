const request = require('supertest');
const app = require('../../src/app');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAwMDAsIm5hbWUiOiJVc2VyICMxIiwiZW1haWwiOiJ1c2VyMUBtYWlsLmNvbSJ9.vIKAw4SadrbCurmOq_6WJCVPXNuhW9G3gQV3EJrjQEE';

// irá rodar antes de executar todos os testes
beforeAll(async () => {
  // await app.knex.migrate.rollback();
  // await app.knex.migrate.latest();
  await app.knex.seed.run();
});

test('Deve listar apenas as transferências do usuário', () => {
  return request(app).get('/v1/transfers')
    .set('authorization', `bearer ${token}`)
    .then((response) => {
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].description).toBe('Transfer #1');
    });
});

test('Deve inserir uma transferência com sucesso', () => {
  return request(app).post('/v1/transfers')
    .set('authorization', `bearer ${token}`)
    .send({ description: 'Regular Transfer', user_id: 10000, account_ori_id: 10000, account_dest_id: 10001, ammount: 100, date: new Date() })
    .then(async (response) => {
      expect(response.status).toBe(201);
      expect(response.body.description).toBe('Regular Transfer');

      const transactions = await app.knex('transactions').where({ transfer_id: response.body.id });
      expect(transactions).toHaveLength(2);
      expect(transactions[0].description).toBe('Transfer to acc #10001');
      expect(transactions[1].description).toBe('Transfer from acc #10000');
      expect(transactions[0].ammount).toBe('-100.00');
      expect(transactions[1].ammount).toBe('100.00');
      expect(transactions[0].account_id).toBe(10000);
      expect(transactions[1].account_id).toBe(10001);
    });
});

describe('Ao salvar uma transferência válida...', () => {
  let transferId = null;
  let income = null;
  let outcome = null;

  test('Deve retornar o status 201 e os dados da transferência', () => {
    return request(app).post('/v1/transfers')
      .set('authorization', `bearer ${token}`)
      .send({ description: 'Regular Transfer', user_id: 10000, account_ori_id: 10000, account_dest_id: 10001, ammount: 100, date: new Date() })
      .then(async (response) => {
        expect(response.status).toBe(201);
        expect(response.body.description).toBe('Regular Transfer');
        transferId = response.body.id;
      });
  });

  test('As transações equivalentes devem ter sido geradas', async () => {
    const transactions = await app.knex('transactions').where({ transfer_id: transferId }).orderBy('ammount');
    expect(transactions).toHaveLength(2);
    [outcome, income] = transactions;
  });

  test('A transação de saída deve ser negativa', () => {
    expect(outcome.description).toBe('Transfer to acc #10001');
    expect(outcome.ammount).toBe('-100.00');
    expect(outcome.account_id).toBe(10000);
    expect(outcome.type).toBe('O');
  });

  test('A transação de entrada deve ser positiva', () => {
    expect(income.description).toBe('Transfer from acc #10000');
    expect(income.ammount).toBe('100.00');
    expect(income.account_id).toBe(10001);
    expect(income.type).toBe('I');
  });

  test('Ambas devem referências a transferência que as originou', () => {
    expect(income.transfer_id).toBe(transferId);
    expect(outcome.transfer_id).toBe(transferId);
  });
});

describe('Ao tentar salvar uma transferência inválida...', () => {
  const validTransfer = { description: 'Regular Transfer', user_id: 10000, account_ori_id: 10000, account_dest_id: 10001, ammount: 100, date: new Date() };

  const template = (newData, errorMessage) => {
    return request(app).post('/v1/transfers')
      .set('authorization', `bearer ${token}`)
      .send({ ...validTransfer, ...newData })
      .then((response) => {
        expect(response.status).toBe(400);
        expect(response.body.error).toBe(errorMessage);
      });
  };

  test('Não deve inserir sem descrição', () => template({ description: null }, 'descrição é um atributo obrigatório'));
  test('Não deve inserir sem valor', () => template({ ammount: null }, 'valor é um atributo obrigatório'));
  test('Não deve inserir sem data', () => template({ date: null }, 'data é um atributo obrigatório'));
  test('Não deve inserir sem conta de origem', () => template({ account_ori_id: null }, 'conta de origem é um atributo obrigatório'));
  test('Não deve inserir sem conta de destino', () => template({ account_dest_id: null }, 'conta de destino é um atributo obrigatório'));
  test('Não deve inserir se as contas de origem e destino forem as mesmas', () => template({ account_dest_id: 10000 }, 'não é possível transferir de uma conta para ela mesma'));
  test('Não deve inserir se as contas pertencerem a outro usuário', () => template({ account_ori_id: 10002 }, 'conta #10002 não pertence ao usuário'));
});

test('Deve retornar uma transferência por Id', () => {
  return request(app).get('/v1/transfers/10000')
    .set('authorization', `bearer ${token}`)
    .then((response) => {
      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Transfer #1');
    });
});

describe('Ao alterar uma transferência válida...', () => {
  let transferId = null;
  let income = null;
  let outcome = null;

  test('Deve retornar o status 200 e os dados da transferência', () => {
    return request(app).put('/v1/transfers/10000')
      .set('authorization', `bearer ${token}`)
      .send({ description: 'Transfer Updated', user_id: 10000, account_ori_id: 10000, account_dest_id: 10001, ammount: 500, date: new Date() })
      .then(async (response) => {
        expect(response.status).toBe(200);
        expect(response.body.description).toBe('Transfer Updated');
        expect(response.body.ammount).toBe('500.00');
        transferId = response.body.id;
      });
  });

  test('As transações equivalentes devem ter sido geradas', async () => {
    const transactions = await app.knex('transactions').where({ transfer_id: transferId }).orderBy('ammount');
    expect(transactions).toHaveLength(2);
    [outcome, income] = transactions;
  });

  test('A transação de saída deve ser negativa', () => {
    expect(outcome.description).toBe('Transfer to acc #10001');
    expect(outcome.ammount).toBe('-500.00');
    expect(outcome.account_id).toBe(10000);
    expect(outcome.type).toBe('O');
  });

  test('A transação de entrada deve ser positiva', () => {
    expect(income.description).toBe('Transfer from acc #10000');
    expect(income.ammount).toBe('500.00');
    expect(income.account_id).toBe(10001);
    expect(income.type).toBe('I');
  });

  test('Ambas devem referências a transferência que as originou', () => {
    expect(income.transfer_id).toBe(transferId);
    expect(outcome.transfer_id).toBe(transferId);
  });

  test('Ambas devem estar com status de realizadas', () => {
    expect(income.status).toBe(true);
    expect(outcome.status).toBe(true);
  });
});

describe('Ao tentar alterar uma transferência inválida...', () => {
  const validTransfer = { description: 'Regular Transfer', user_id: 10000, account_ori_id: 10000, account_dest_id: 10001, ammount: 100, date: new Date() };

  const template = (newData, errorMessage) => {
    return request(app).put('/v1/transfers/10000')
      .set('authorization', `bearer ${token}`)
      .send({ ...validTransfer, ...newData })
      .then((response) => {
        expect(response.status).toBe(400);
        expect(response.body.error).toBe(errorMessage);
      });
  };

  test('Não deve inserir sem descrição', () => template({ description: null }, 'descrição é um atributo obrigatório'));
  test('Não deve inserir sem valor', () => template({ ammount: null }, 'valor é um atributo obrigatório'));
  test('Não deve inserir sem data', () => template({ date: null }, 'data é um atributo obrigatório'));
  test('Não deve inserir sem conta de origem', () => template({ account_ori_id: null }, 'conta de origem é um atributo obrigatório'));
  test('Não deve inserir sem conta de destino', () => template({ account_dest_id: null }, 'conta de destino é um atributo obrigatório'));
  test('Não deve inserir se as contas de origem e destino forem as mesmas', () => template({ account_dest_id: 10000 }, 'não é possível transferir de uma conta para ela mesma'));
  test('Não deve inserir se as contas pertencerem a outro usuário', () => template({ account_ori_id: 10002 }, 'conta #10002 não pertence ao usuário'));
});

describe('Ao remover uma transferência', () => {
  test('Deve retornar o status 204', () => {
    return request(app).delete('/v1/transfers/10000')
      .set('authorization', `bearer ${token}`)
      .then((response) => {
        expect(response.status).toBe(204);
      });
  });

  test('O registro deve ter sido removido do banco', () => {
    return app.knex('transfers').where({ id: 10000 }).then((result) => {
      expect(result).toHaveLength(0);
    });
  });

  test('As transações associadas devem ter sido removidas', () => {
    return app.knex('transactions').where({ transfer_id: 10000 }).then((result) => {
      expect(result).toHaveLength(0);
    });
  });
});

test('Não deve retornar transferência de outro usuário ', () => {
  return request(app).get('/v1/transfers/10001')
    .set('authorization', `bearer ${token}`)
    .then((response) => {
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Este recurso não pertence ao usuário');
    });
});
