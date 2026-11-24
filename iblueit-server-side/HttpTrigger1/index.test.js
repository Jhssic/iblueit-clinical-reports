const handler = require('./index');
const { createContext } = require('../test-utils/mongooseMock');

describe('HttpTrigger1', () => {
    test('cumprimenta pelo nome recebido na query string', async () => {
        const context = createContext();
        await handler(context, { query: { name: 'Ana' } });
        expect(context.res.body).toBe('Hello, Ana. This HTTP triggered function executed successfully.');
    });

    test('cumprimenta pelo nome recebido no corpo', async () => {
        const context = createContext();
        await handler(context, { query: {}, body: { name: 'Bia' } });
        expect(context.res.body).toContain('Hello, Bia.');
    });

    test('sem nome devolve a mensagem genérica', async () => {
        const context = createContext();
        await handler(context, { query: {} });
        expect(context.res.body).toMatch(/^This HTTP triggered function executed successfully\./);
        expect(context.log).toHaveBeenCalled();
    });
});
