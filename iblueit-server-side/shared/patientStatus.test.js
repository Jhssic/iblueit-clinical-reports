const { PATIENT_STATUS, ATTENTION_DJ_DROP_PCT, computePatientStatus, withPatientStatus } = require('./patientStatus');

describe('computePatientStatus (RF09)', () => {
    test('sem relatório não há status', () => {
        expect(computePatientStatus(null)).toBeNull();
    });

    test('crítico quando algum alerta disparou, mesmo com DJ subindo', () => {
        const report = { alerts: [{ metric: 'DJ' }], currentMetrics: { DJ: 0.9 }, previousMetrics: { DJ: 0.5 } };
        expect(computePatientStatus(report)).toBe(PATIENT_STATUS.CRITICO);
    });

    test('atenção quando não há alerta mas o DJ caiu o limite ou mais', () => {
        expect(ATTENTION_DJ_DROP_PCT).toBe(10);
        const report = { alerts: [], currentMetrics: { DJ: 0.45 }, previousMetrics: { DJ: 0.5 } };
        expect(computePatientStatus(report)).toBe(PATIENT_STATUS.ATENCAO);
    });

    test('estável quando a queda do DJ fica abaixo do limite', () => {
        const report = { alerts: [], currentMetrics: { DJ: 0.46 }, previousMetrics: { DJ: 0.5 } };
        expect(computePatientStatus(report)).toBe(PATIENT_STATUS.ESTAVEL);
    });

    test('estável no primeiro relatório (sem período anterior) e com DJ anterior zero', () => {
        expect(computePatientStatus({ alerts: [], currentMetrics: { DJ: 0.5 }, previousMetrics: null })).toBe(PATIENT_STATUS.ESTAVEL);
        expect(computePatientStatus({ currentMetrics: { DJ: 0.5 }, previousMetrics: { DJ: 0 } })).toBe(PATIENT_STATUS.ESTAVEL);
    });
});

describe('withPatientStatus', () => {
    test('mantém o status já salvo no relatório', () => {
        expect(withPatientStatus({ status: 'atencao', alerts: [{ metric: 'DJ' }] }).status).toBe('atencao');
    });

    test('calcula o status de relatórios antigos e converte documentos do mongoose', () => {
        expect(withPatientStatus({ alerts: [{ metric: 'DJ' }] }).status).toBe('critico');
        const doc = { toObject: () => ({ alerts: [] }) };
        expect(withPatientStatus(doc)).toEqual({ alerts: [], status: 'estavel' });
    });

    test('não altera valores vazios nem o objeto original', () => {
        expect(withPatientStatus(null)).toBeNull();
        const original = { alerts: [] };
        withPatientStatus(original);
        expect(original).not.toHaveProperty('status');
    });
});
