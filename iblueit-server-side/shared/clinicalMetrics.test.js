jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { query } = require('../test-utils/mongooseMock');
const clinicalMetrics = require('./clinicalMetrics');

require('./PlataformOverview');
require('./GameParameter');
require('./Pacient');
const PlataformOverviewModel = mongoose.model('PlataformOverview');
const GameParameterModel = mongoose.model('GameParameter');
const PacientModel = mongoose.model('Pacient');

const start = new Date('2024-01-01');
const end = new Date('2024-01-31');

beforeEach(() => {
    mongoose.__resetAll();
});

describe('extractMetricsForPeriod', () => {
    test('calcula médias, fluxos e capacidades do dispositivo a partir das collections', async () => {
        const sessionsQuery = query([
            {
                scoreRatio: 0.5, score: 100, BorgScale: 2,
                flowDataDevicesId: {
                    flowDataDevices: [{ flowData: [{ flowValue: -10 }, { flowValue: 30 }] }],
                },
            },
            { scoreRatio: 0.7, score: null, BorgScale: 4, flowDataDevicesId: null },
        ]);
        PlataformOverviewModel.find.mockReturnValue(sessionsQuery);
        GameParameterModel.find.mockResolvedValue([{ ObjectSpeedFactor: 1 }, { ObjectSpeedFactor: 2 }]);
        PacientModel.findById.mockResolvedValue({
            capacitiesMano: { respiratoryRate: 12, insPeakFlow: 40, expPeakFlow: 60, insFlowDuration: 3, expFlowDuration: 5 },
        });

        const result = await clinicalMetrics.extractMetricsForPeriod(
            { pacientId: 'pac-1', device: 'Manovacuômetro', start, end }, mongoose
        );

        expect(PlataformOverviewModel.find).toHaveBeenCalledWith({ pacientId: 'pac-1', playFinish: { $gte: start, $lte: end } });
        expect(sessionsQuery.populate).toHaveBeenCalledWith('flowDataDevicesId');
        expect(GameParameterModel.find).toHaveBeenCalledWith({ pacientId: 'pac-1', created_at: { $gte: start, $lte: end } });
        expect(PacientModel.findById).toHaveBeenCalledWith('pac-1');

        expect(result.sessionCount).toBe(2);
        expect(result.metrics).toEqual({
            DJ: 0.6, PJ: 100, CGc: 1.5,
            FR: 12, PEmax: 60, PImax: 40, TEmax: 5, TImax: 3,
            SpO2min: null, FLi: -10, FLe: 30, EB: 3,
        });
        expect(result.metricSources.FR).toBe('pacients');
        expect(result.metricSources.SpO2min).toBeNull();
    });

    test('devolve métricas nulas quando não há sessões nem paciente', async () => {
        PlataformOverviewModel.find.mockReturnValue(query([]));
        GameParameterModel.find.mockResolvedValue([]);
        PacientModel.findById.mockResolvedValue(null);

        const result = await clinicalMetrics.extractMetricsForPeriod(
            { pacientId: 'pac-1', device: 'Desconhecido', start, end }, mongoose
        );

        expect(result.sessionCount).toBe(0);
        Object.values(result.metrics).forEach((v) => expect(v).toBeNull());
    });
});

describe('dados mínimos (RN02 / FA02)', () => {
    const completo = {
        sessionCount: 3,
        metrics: { FR: 1, PEmax: 1, PImax: 1, TEmax: 1, TImax: 1, FLi: 1, FLe: 1, EB: 1, DJ: null, PJ: 1, CGc: null, SpO2min: null },
    };

    test('hasMinimumData é verdadeiro com todas as métricas obrigatórias presentes', () => {
        expect(clinicalMetrics.hasMinimumData(completo)).toBe(true);
    });

    test('hasMinimumData é falso sem sessões, mesmo com métricas', () => {
        expect(clinicalMetrics.hasMinimumData({ ...completo, sessionCount: 0 })).toBe(false);
    });

    test('hasMinimumData é falso e missingFields lista as obrigatórias ausentes', () => {
        const incompleto = { sessionCount: 1, metrics: { ...completo.metrics, FR: null, EB: undefined } };
        expect(clinicalMetrics.hasMinimumData(incompleto)).toBe(false);
        expect(clinicalMetrics.missingFields(incompleto)).toEqual(['FR', 'EB']);
    });

    test('missingOptionalFields lista só as opcionais ausentes', () => {
        expect(clinicalMetrics.missingOptionalFields(completo)).toEqual(['DJ', 'CGc', 'SpO2min']);
    });
});
