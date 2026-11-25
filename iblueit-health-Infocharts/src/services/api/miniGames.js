import axios from 'axios';
import moment from "moment";

import { BaseUrl } from '../../providers/_config';
import { getTokenParameters } from '../../providers/sessionStorage';
import { extractMessage } from '../../components/notification';


const toDayKey = (date) => moment(date).format("L");

const getBestRoundFlow = (session) =>
  session.flowDataRounds.sort((first, second) => second.roundFlowScore - first.roundFlowScore)[0].roundFlowScore;

// Agrupa as sessões por dia, mantendo o maior fluxo registrado em cada dia.
const groupBestFlowByDay = (sessionData) => {
  const graphDataByDay = {};
  for (const session of sessionData) {
    const day = toDayKey(session.created_at);
    const flowValue = getBestRoundFlow(session);
    const current = graphDataByDay[day];
    if (!current || flowValue > current.flowValue) {
      graphDataByDay[day] = { flowValue };
    }
  }
  return graphDataByDay;
};

const buildCalibrationLevels = (calibrationValue) => ({
  calibration_100: calibrationValue,
  calibration_50: 0.75 * Number(calibrationValue),
  calibration_25: 0.5 * Number(calibrationValue),
});

// Acrescenta ao agrupamento diário as faixas de calibração do pico correspondente ao minigame.
const mergeCalibrationsByDay = (graphDataByDay, calibrationsData, minigameName) => {
  const typeFilter = (minigameName === 'CakeGame') ? 'ExpiratoryPeak' : 'InspiratoryPeak';
  const calibrations = calibrationsData.filter(elem => elem.calibrationExercise === typeFilter);
  calibrations.sort((first, second) => first.calibrationValue - second.calibrationValue);

  for (const calibration of calibrations) {
    const day = toDayKey(calibration.created_at);
    graphDataByDay[day] = {
      ...graphDataByDay[day],
      ...buildCalibrationLevels(calibration.calibrationValue),
    };
  }
};

const toGraphPoint = (sessionDate, dayData, typeGraph) => ({
  sessionDate,
  flowValue: dayData.flowValue,
  ...(typeGraph) ? {
    calibration_100: dayData.calibration_100,
    calibration_50: dayData.calibration_50,
    calibration_25: dayData.calibration_25,
  } : {}
});

const getGeneralStatisticsDataFromTheMiniGame = async (context, filters, typeGraph) => {
  context.setLoading(true);
  try {
    const GameToken = getTokenParameters('gameToken');
    const result = await axios.get(`${BaseUrl()}/pacients/${context.patientId}/minigames`,
      { params: { sort: 'asc', ...filters }, headers: { GameToken } }
    );

    const resultMiniGames = result.data.data || [];
    const sessionData = resultMiniGames.sort((first, second) => second.created_at - first.created_at);
    const graphDataByDay = groupBestFlowByDay(sessionData);

    if (typeGraph) {
      const resultCalibrations = await axios.get(`${BaseUrl()}/pacients/${context.patientId}/calibrations`,
        { params: { sort: 'asc', ...filters }, headers: { GameToken } }
      );
      mergeCalibrationsByDay(graphDataByDay, resultCalibrations.data.data || [], filters.minigameName);
    }

    return Object.entries(graphDataByDay).map(([day, dayData]) => toGraphPoint(day, dayData, typeGraph));
  } catch (error) {
    context.addNotification('error', extractMessage(error, ''));
  } finally {
    context.setLoading(false);
  }
}

// O comparativo entre pacientes ainda não é montado a partir dos dados do servidor: o gráfico
// usa dados de exemplo, então o serviço apenas consulta as estatísticas e devolve um placeholder.
const getMiniGameComparative = async (context, filters) => {
  context.setLoading(true);
  try {
    const GameToken = getTokenParameters('gameToken');
    await axios.get(`${BaseUrl()}/minigames/statistics`,
      { params: { ...filters }, headers: { GameToken } }
    );
  } catch (error) {
    // Falhas não interrompem a tela: o comparativo segue exibindo os dados de exemplo.
    console.error(error);
  } finally {
    context.setLoading(false);
  }
  return [{}];
}

export {
  getGeneralStatisticsDataFromTheMiniGame,
  getMiniGameComparative,
};
