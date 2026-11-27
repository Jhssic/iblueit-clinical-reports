const validators = require('./Validators');
const fixtures = require('../test-utils/fixtures');

describe('Validators', () => {
    test('plataformOverviewSaveValidator aceita sessão completa e rejeita dispositivo desconhecido', () => {
        expect(validators.plataformOverviewSaveValidator(fixtures.plataformOverview()).errorCount).toBe(0);

        const invalido = fixtures.plataformOverview();
        invalido.flowDataDevices[0].deviceName = 'Espirômetro';
        delete invalido.score;
        const result = validators.plataformOverviewSaveValidator(invalido);
        expect(result.errorCount).toBeGreaterThan(0);
        expect(result.errors.errors).toHaveProperty('score');
        expect(result.errors.errors).toHaveProperty(['flowDataDevices.0.deviceName']);
    });

    test('gameParameterValidator exige pacientId no formato ObjectId', () => {
        expect(validators.gameParameterValidator(fixtures.gameParameter()).errorCount).toBe(0);
        const result = validators.gameParameterValidator({ ...fixtures.gameParameter(), pacientId: '123' });
        expect(result.errors.errors).toHaveProperty('pacientId');
    });

    test('pacientSaveValidator normaliza a data de nascimento (/ -> -) e valida os enums', () => {
        const pacient = fixtures.pacient();
        expect(validators.pacientSaveValidator(pacient).errorCount).toBe(0);
        expect(pacient.birthday).toBe('2010-05-20');

        const result = validators.pacientSaveValidator({ ...fixtures.pacient(), sex: 'X', condition: 'Doente' });
        expect(result.errors.errors).toHaveProperty('sex');
        expect(result.errors.errors).toHaveProperty('condition');
    });

    test('minigameOverviewSaveValidator valida nome do minigame e rodadas', () => {
        expect(validators.minigameOverviewSaveValidator(fixtures.minigameOverview()).errorCount).toBe(0);
        const result = validators.minigameOverviewSaveValidator({ ...fixtures.minigameOverview(), minigameName: 'Outro' });
        expect(result.errors.errors).toHaveProperty('minigameName');
    });

    test('calibrationOverviewSaveValidator exige valor inteiro de calibração', () => {
        expect(validators.calibrationOverviewSaveValidator(fixtures.calibrationOverview()).errorCount).toBe(0);
        const result = validators.calibrationOverviewSaveValidator({ ...fixtures.calibrationOverview(), calibrationValue: 'abc' });
        expect(result.errors.errors).toHaveProperty('calibrationValue');
    });

    test('createTokenValidator exige userId', () => {
        expect(validators.createTokenValidator({ userId: fixtures.PACIENT_ID }).errorCount).toBe(0);
        expect(validators.createTokenValidator({}).errors.errors).toHaveProperty('userId');
    });

    test('createUserValidator exige pacientId somente para o papel User', () => {
        const admin = { fullname: 'Ana', username: 'ana', password: 'x', email: 'ana@exemplo.com', role: 'Administrator' };
        expect(validators.createUserValidator(admin).errorCount).toBe(0);

        const result = validators.createUserValidator({ ...admin, role: 'User' });
        expect(result.errors.errors).toHaveProperty('pacientId');

        const emailInvalido = validators.createUserValidator({ ...admin, email: 'nao-e-email' });
        expect(emailInvalido.errors.errors).toHaveProperty('email');
    });

    test('authenticateValidator exige usuário e senha', () => {
        expect(validators.authenticateValidator({ username: 'a', password: 'b' }).errorCount).toBe(0);
        expect(validators.authenticateValidator({ username: 'a' }).errors.errors).toHaveProperty('password');
    });

    test('generateClinicalReportValidator exige dispositivo válido e período', () => {
        const ok = { device: 'Pitaco', period: { start: '2024-01-01', end: '2024-01-31' } };
        expect(validators.generateClinicalReportValidator(ok).errorCount).toBe(0);
        const result = validators.generateClinicalReportValidator({ device: 'Outro', period: {} });
        expect(result.errors.errors).toHaveProperty('device');
        expect(result.errors.errors).toHaveProperty(['period.start']);
    });

    test('saveAlertCriteriaValidator aceita critérios válidos e rejeita métrica/condição desconhecidas', () => {
        const ok = { criteria: [{ metric: 'DJ', condition: 'Abaixo do valor', triggerValue: 2 }] };
        expect(validators.saveAlertCriteriaValidator(ok).errorCount).toBe(0);
        const result = validators.saveAlertCriteriaValidator({ criteria: [{ metric: 'XX', condition: 'qualquer', triggerValue: 'a' }] });
        expect(result.errors.errors).toHaveProperty(['criteria.0.metric']);
        expect(result.errors.errors).toHaveProperty(['criteria.0.condition']);
        expect(result.errors.errors).toHaveProperty(['criteria.0.triggerValue']);
    });

    test('saveAlertCriteriaValidator exige criteria e valida triggerValue conforme a condição', () => {
        const check = (condition, triggerValue) => validators.saveAlertCriteriaValidator(
            { criteria: [{ metric: 'DJ', condition, triggerValue }] }
        );
        expect(validators.saveAlertCriteriaValidator({}).errors.errors).toHaveProperty('criteria');

        // consecutiva: inteiro >= 2
        expect(check('Deterioração consecutiva', 2).errorCount).toBe(0);
        expect(check('Deterioração consecutiva', 6).errorCount).toBe(0);
        [0, 1, 2.5].forEach((v) => {
            const r = check('Deterioração consecutiva', v);
            expect(r.errorCount).toBe(1);
            expect(r.errors.errors['criteria.0.triggerValue'][0]).toMatch(/inteiro/);
        });
        // percentual e sensibilidade: 1..100
        ['Queda percentual >', 'Anomalia (IA)'].forEach((c) => {
            expect(check(c, 1).errorCount).toBe(0);
            expect(check(c, 100).errorCount).toBe(0);
            expect(check(c, 0).errorCount).toBe(1);
            expect(check(c, 150).errorCount).toBe(1);
        });
        // abaixo do valor: qualquer número
        expect(check('Abaixo do valor', 0.3).errorCount).toBe(0);
        expect(check('Abaixo do valor', -5).errorCount).toBe(0);
    });
});
