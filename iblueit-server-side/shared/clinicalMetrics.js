/*
 * Extração das métricas clínicas (DJ, PJ, CGc, FR, PEmax, PImax, TEmax, TImax,
 * SpO2min, FLi, FLe, EB) a partir das collections MongoDB, para consumo pela
 * Azure Function GenerateClinicalReport.
 *
 * ATENÇÃO — mapeamentos marcados com "CONFIRMAR": o RFC exige essas métricas
 * "conforme Tabelas 26 e 27 de Dias (2024)", mas os schemas atuais do Mongo
 * não têm campos com esses nomes literais. Os mapeamentos abaixo são a melhor
 * aproximação disponível nos dados existentes e PRECISAM ser confirmados
 * contra a tese antes de qualquer validação com os fisioterapeutas parceiros.
 *
 * SpO2min não tem nenhuma fonte de dado no ecossistema atual (não há
 * integração com oxímetro) — é retornado como null e tratado pelo fluxo
 * alternativo FA02 (dados parcialmente ausentes) do RFC.
 */

// Pacient.capacities<Sufixo> usa nomes curtos que não são iguais ao valor de
// "device" recebido (ver Validators.js) — Manovacuômetro -> Mano.
const DEVICE_CAPACITIES_SUFFIX = {
    Pitaco: 'Pitaco',
    Manovacuômetro: 'Mano',
    Cinta: 'Cinta',
};

// Mínimo/máximo com laço simples: `Math.min(...valores)` espalha o array
// inteiro como argumentos da função e estoura a pilha (RangeError) com as
// dezenas de milhares de amostras de fluxo que um período longo acumula.
function minMax(values) {
    if (!values.length) return { min: null, max: null };
    let min = values[0];
    let max = values[0];
    for (const v of values) {
        if (v < min) min = v;
        if (v > max) max = v;
    }
    return { min, max };
}

// `endExclusive`: usado pelo período anterior, que termina exatamente onde o
// atual começa — com $lte uma sessão bem no limite seria contada nos dois.
async function extractMetricsForPeriod({ pacientId, device, start, end, endExclusive = false }, mongoose) {
    require('./PlataformOverview');
    require('./GameParameter');
    require('./FlowDataDevice');
    require('./Pacient');

    const PlataformOverviewModel = mongoose.model('PlataformOverview');
    const GameParameterModel = mongoose.model('GameParameter');
    const PacientModel = mongoose.model('Pacient');

    const dateFilter = endExclusive ? { $gte: start, $lt: end } : { $gte: start, $lte: end };

    // Filtra pela data real da sessão (playFinish), não por created_at — a data
    // de inserção no banco não é garantia da data em que a sessão aconteceu
    // (ex: sincronização atrasada, importação de dados históricos).
    // Filtra também pelo dispositivo do relatório (gameDevice), igual a
    // alertEvaluation.js — sem isso, DJ/PJ/EB de sessões jogadas com outro
    // dispositivo entravam no relatório do Pitaco/Manovacuômetro (RF02).
    const plataformSessions = await PlataformOverviewModel.find({
        pacientId,
        gameDevice: device,
        playFinish: dateFilter,
    }).populate('flowDataDevicesId');

    // GameParameter não tem campo de data da sessão no schema atual (só
    // created_at/updated_at) — usando created_at aqui é a única opção disponível.
    const gameParameters = await GameParameterModel.find({
        pacientId,
        created_at: dateFilter,
    });

    const pacient = await PacientModel.findById(pacientId);

    const sessionCount = plataformSessions.length;

    // DJ (Desempenho do Jogador) / PJ (Pontos da Jogada) / EB (Escala de Borg)
    // CONFIRMAR contra Tabela 27 de Dias (2024) — usando scoreRatio/score/BorgScale
    // como melhor aproximação disponível em plataformoverviews.
    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

    const DJ = avg(plataformSessions.map((s) => s.scoreRatio).filter((v) => v != null));
    const PJ = avg(plataformSessions.map((s) => s.score).filter((v) => v != null));
    const EB = avg(plataformSessions.map((s) => s.BorgScale).filter((v) => v != null));

    // CGc (Carga Corrente) — CONFIRMAR contra Tabela 27. Usando ObjectSpeedFactor
    // de gameparameters como aproximação (não confirmado).
    const CGc = avg(gameParameters.map((g) => g.ObjectSpeedFactor).filter((v) => v != null));

    // FLi / FLe (fluxo inspiratório/expiratório) — derivados dos dados brutos de
    // flowdatadevices já vinculados a cada sessão da plataforma. Só as
    // amostras do dispositivo do relatório (deviceName): uma sessão pode ter
    // dados de mais de um dispositivo, e fluxo do Pitaco misturado com
    // pressão do Manovacuômetro não tem significado clínico.
    const flowValues = [];
    plataformSessions.forEach((s) => {
        (s.flowDataDevicesId?.flowDataDevices || [])
            .filter((d) => d.deviceName === device)
            .forEach((d) => {
                (d.flowData || []).forEach((f) => {
                    if (f.flowValue != null) flowValues.push(f.flowValue);
                });
            });
    });
    const { min: FLi, max: FLe } = minMax(flowValues);

    // FR, PEmax, PImax, TEmax, TImax — CONFIRMAR contra Tabela 26. O RFC associa
    // essas métricas à collection calibrationoverviews, mas ela só guarda
    // calibrationValue/calibrationExercise. Usando o perfil de capacidades do
    // paciente (Pacient.capacities<Device>), que é o dado de calibração mais
    // próximo disponível hoje.
    const capacitiesKey = 'capacities' + (DEVICE_CAPACITIES_SUFFIX[device] || device); // ex: capacitiesPitaco
    const capacities = pacient ? pacient[capacitiesKey] : null;

    const FR = capacities ? capacities.respiratoryRate : null;
    const PImax = capacities ? capacities.insPeakFlow : null;
    const PEmax = capacities ? capacities.expPeakFlow : null;
    const TImax = capacities ? capacities.insFlowDuration : null;
    const TEmax = capacities ? capacities.expFlowDuration : null;

    // SpO2min — sem fonte de dado no ecossistema atual (sem integração com oxímetro).
    const SpO2min = null;

    const metricSources = {
        DJ: 'plataformoverviews', PJ: 'plataformoverviews', EB: 'plataformoverviews',
        CGc: 'gameparameters',
        FLi: 'flowdatadevices', FLe: 'flowdatadevices',
        FR: 'pacients', PImax: 'pacients', PEmax: 'pacients', TImax: 'pacients', TEmax: 'pacients',
        SpO2min: null,
    };

    return {
        sessionCount,
        metrics: { DJ, PJ, CGc, FR, PEmax, PImax, TEmax, TImax, SpO2min, FLi, FLe, EB },
        metricSources,
    };
}

// RN02: dados mínimos obrigatórios pra gerar relatório. SpO2min é excluído
// dessa checagem porque não existe fonte de dado no sistema atual (ver FA02).
const REQUIRED_METRICS = ['FR', 'PEmax', 'PImax', 'TEmax', 'TImax', 'FLi', 'FLe', 'EB'];

function hasMinimumData({ sessionCount, metrics }) {
    if (sessionCount === 0) return false;
    const missing = REQUIRED_METRICS.filter((key) => metrics[key] == null);
    return missing.length === 0;
}

function missingFields({ metrics }) {
    return REQUIRED_METRICS.filter((key) => metrics[key] == null);
}

// FA02: métricas não obrigatórias que podem faltar sem bloquear a geração do
// relatório — o sistema prossegue com o que tem e indica o que não pôde ser
// consultado (ex: CGc sem sessão de gameparameters no período, SpO2min
// sem fonte de dado no ecossistema atual).
const OPTIONAL_METRICS = ['DJ', 'PJ', 'CGc', 'SpO2min'];

function missingOptionalFields({ metrics }) {
    return OPTIONAL_METRICS.filter((key) => metrics[key] == null);
}

module.exports = {
    extractMetricsForPeriod,
    hasMinimumData,
    missingFields,
    missingOptionalFields,
    REQUIRED_METRICS,
    OPTIONAL_METRICS,
    // Exportada só pra teste unitário.
    minMax,
};
