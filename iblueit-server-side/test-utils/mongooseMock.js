/*
 * Mongoose falso pros testes das Azure Functions (Jest).
 *
 * Uso em cada arquivo de teste:
 *   jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());
 *
 * Os módulos de shared/*.js continuam sendo executados de verdade (chamam
 * mongoose.Schema / mongoose.model(nome, schema)), mas cada model registrado
 * vira um construtor falso com métodos estáticos jest.fn(), sem banco.
 */

// Query "encadeável" e "await-ável", igual a uma Query do Mongoose:
// Model.find(...).sort(...).limit(...) e também `await Model.find(...)`.
function query(result, error) {
    const q = {};
    ['sort', 'limit', 'skip', 'populate', 'select', 'lean', 'session'].forEach((m) => {
        q[m] = jest.fn(() => q);
    });
    q.exec = jest.fn(() => (error ? Promise.reject(error) : Promise.resolve(result)));
    q.then = (onOk, onErr) => q.exec().then(onOk, onErr);
    q.catch = (onErr) => q.exec().catch(onErr);
    return q;
}

// Pipeline de aggregate falso — registra as etapas chamadas e resolve em exec().
function aggregate(result, error) {
    const agg = { stages: [] };
    ['append', 'match', 'sort', 'lookup', 'limit', 'skip', 'project', 'unwind',
        'replaceRoot', 'group', 'addFields'].forEach((m) => {
        agg[m] = jest.fn((...args) => {
            agg.stages.push({ [m]: args });
            return agg;
        });
    });
    agg.exec = jest.fn(() => (error ? Promise.reject(error) : Promise.resolve(result)));
    return agg;
}

const STATIC_METHODS = [
    'find', 'findOne', 'findById', 'findOneAndUpdate', 'countDocuments',
    'deleteOne', 'deleteMany', 'updateOne', 'insertMany', 'aggregate',
];

function createModel(name) {
    function Model(doc) {
        Object.assign(this, doc);
        Model.instances.push(this);
    }
    Model.modelName = name;
    Model.instances = [];
    Model.db = { startSession: jest.fn() };
    STATIC_METHODS.forEach((m) => { Model[m] = jest.fn(); });
    Model.prototype.save = jest.fn();

    Model.__reset = () => {
        Model.instances.length = 0;
        STATIC_METHODS.forEach((m) => Model[m].mockReset());
        Model.db.startSession.mockReset();
        Model.prototype.save.mockReset();
        // Padrão: save() devolve o próprio documento com um _id gerado.
        let seq = 0;
        Model.prototype.save.mockImplementation(function save() {
            if (!this._id) this._id = `${name}-id-${++seq}`;
            return Promise.resolve(this);
        });
    };
    Model.__reset();
    return Model;
}

function createMongooseMock() {
    const models = {};

    function Schema(definition, options) {
        if (!(this instanceof Schema)) return new Schema(definition, options);
        this.definition = definition;
        this.options = options;
    }
    Schema.Types = { Mixed: 'Mixed', ObjectId: 'ObjectId' };

    const mongoose = {
        Schema,
        connection: { readyState: 0 },
        connect: jest.fn(),
        Promise: undefined,
        Types: { ObjectId: jest.fn((id) => ({ objectId: id })) },
        model(name) {
            if (!models[name]) models[name] = createModel(name);
            return models[name];
        },
        __models: models,
        __resetAll() {
            Object.values(models).forEach((M) => M.__reset());
            mongoose.connect.mockClear();
            mongoose.Types.ObjectId.mockClear();
            mongoose.connection.readyState = 0;
        },
    };
    return mongoose;
}

// Contexto falso da Azure Function: guarda context.res e conta context.done().
function createContext() {
    return { res: undefined, log: jest.fn(), done: jest.fn() };
}

function createReq({ headers = { gametoken: 'token-valido' }, params = {}, query = {}, body } = {}) {
    return { headers, params, query, body };
}

// Configura o UserAccount.findOne pra autenticação (verifyGameToken e
// requireClinicalStaff consultam pelo gameToken).
function authenticate(mongoose, user = { _id: 'user-1', role: 'Administrator' }) {
    require('../shared/UserAccount');
    mongoose.model('UserAccount').findOne.mockResolvedValue(user);
}

module.exports = {
    createMongooseMock,
    query,
    aggregate,
    createContext,
    createReq,
    authenticate,
};
