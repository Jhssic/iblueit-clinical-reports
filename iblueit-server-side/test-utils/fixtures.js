// Payloads válidos (conforme shared/Validators.js) reutilizados pelos testes.
// Funções (e não objetos) pra cada teste receber uma cópia nova, já que os
// handlers mutam o corpo da requisição.

const PACIENT_ID = '5f1d7a2b3c4d5e6f7a8b9c0d';

const capacities = () => ({
    insPeakFlow: 10, expPeakFlow: 20, insFlowDuration: 3, expFlowDuration: 4, respiratoryRate: 12,
});

const pacient = () => ({
    name: 'Paciente Teste',
    sex: 'Female',
    birthday: '2010/05/20',
    capacitiesPitaco: capacities(),
    capacitiesMano: capacities(),
    capacitiesCinta: capacities(),
    condition: 'Healthy',
    unlockedLevels: 1,
    accumulatedScore: 100,
    playSessionsDone: 2,
    currentPerformance: 0.5,
    currentBorgScale: 3,
    calibrationPitacoDone: true,
    calibrationManoDone: false,
    calibrationCintaDone: false,
    howToPlayDone: true,
    weight: 40,
    height: 150,
    pitacoThreshold: 0.2,
    manoThreshold: 0.2,
    cintaThreshold: 0.2,
    ethnicity: 'Parda',
});

const flowDataDevice = (deviceName, values) => ({
    deviceName,
    flowData: values.map((flowValue, i) => ({ flowValue, timestamp: `2024-01-01T10:00:0${i}Z` })),
});

const plataformOverview = () => ({
    pacientId: PACIENT_ID,
    flowDataDevices: [flowDataDevice('Pitaco', [-5, 10, 25])],
    playStart: '2024-01-01T10:00:00Z',
    playFinish: '2024-01-01T10:05:00Z',
    duration: 300,
    result: 'Win',
    stageId: 1,
    phase: 1,
    level: 2,
    relaxTimeSpawned: false,
    score: 80,
    maxScore: 100,
    scoreRatio: 0.8,
    TargetsSpawned: 10,
    TargetsSuccess: 8,
    TargetsInsSuccess: 4,
    TargetsExpSuccess: 4,
    TargetsFails: 2,
    TargetsInsFail: 1,
    TargetsExpFail: 1,
    ObstaclesSpawned: 5,
    ObstaclesSuccess: 4,
    ObstaclesInsSuccess: 2,
    ObstaclesExpSuccess: 2,
    ObstaclesFail: 1,
    ObstaclesInsFail: 0,
    ObstaclesExpFail: 1,
    PlayerHp: 3,
    BorgScale: 2,
});

const minigameRound = (minigameRound) => ({
    minigameRound,
    roundScore: 1,
    roundFlowScore: 0.5,
    flowDataDevices: [flowDataDevice('Pitaco', [1, 2])],
});

const minigameOverview = () => ({
    pacientId: PACIENT_ID,
    minigameName: 'CakeGame',
    respiratoryExercise: 'ExpiratoryPeak',
    flowDataRounds: [minigameRound(1), minigameRound(2), minigameRound(3)],
});

const calibrationOverview = () => ({
    pacientId: PACIENT_ID,
    gameDevice: 'Pitaco',
    calibrationExercise: 'ExpiratoryPeak',
    calibrationValue: 120,
});

const gameParameter = () => ({
    stageId: 1,
    phase: 2,
    level: 3,
    pacientId: PACIENT_ID,
    ObjectSpeedFactor: 1.5,
    Loops: 2,
    HeightIncrement: 0.1,
    HeightUpThreshold: 0.8,
    HeightDownThreshold: 0.2,
    SizeIncrement: 0.1,
    SizeUpThreshold: 0.8,
    SizeDownThreshold: 0.2,
});

module.exports = {
    PACIENT_ID,
    pacient,
    plataformOverview,
    minigameOverview,
    calibrationOverview,
    gameParameter,
};
