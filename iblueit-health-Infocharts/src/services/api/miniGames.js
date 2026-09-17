/* eslint-disable no-throw-literal */
/* eslint-disable no-unused-vars */
import axios from 'axios';
import moment from "moment";

import { BaseUrl } from '../../providers/_config';
import { getTokenParameters } from '../../providers/sessionStorage';
import { extractMessage } from '../../components/notification';


const getGeneralStatisticsDataFromTheMiniGame = async (context, filters, typeGraph) => {
  context.setLoading(true);
  try {
    const GameToken = getTokenParameters('gameToken');
    const result = await axios.get(`${BaseUrl()}/pacients/${context.patientId}/minigames`,
      { params: { sort: 'asc', ...filters }, headers: { GameToken } }
    );

    const resultMiniGames = (result.data.data) ? result.data.data : [];
    const sessionData = resultMiniGames.sort((first, second) => second.created_at - first.created_at);
    const tempGraphData = {};
    const graphData = [];

    for (const element of sessionData) {
      const flowValue = element.flowDataRounds.sort((first, second) => second.roundFlowScore - first.roundFlowScore)[0].roundFlowScore;
      if (tempGraphData[moment(element.created_at).format("L")]) {
        tempGraphData[moment(element.created_at).format("L")] = (flowValue > tempGraphData[moment(element.created_at).format("L")])
          ? { flowValue }
          : { flowValue: tempGraphData[moment(element.created_at).format("L")] };
      } else {
        tempGraphData[moment(element.created_at).format("L")] = { flowValue };
      }
    }

    if (typeGraph) {
      const resultCalibrations = await axios.get(`${BaseUrl()}/pacients/${context.patientId}/calibrations`,
        { params: { sort: 'asc', ...filters }, headers: { GameToken } }
      );
      const calibrationsData = (resultCalibrations.data.data) ? resultCalibrations.data.data : [];
      const typeFilter = (filters.minigameName === 'CakeGame') ? 'ExpiratoryPeak' : 'InspiratoryPeak';
      const tempCalibrationsData = calibrationsData.filter(elem => elem.calibrationExercise === typeFilter);
      tempCalibrationsData.sort((first, second) => first.calibrationValue - second.calibrationValue);

      for (const element of tempCalibrationsData) {
        if (tempGraphData[moment(element.created_at).format("L")]) {
          tempGraphData[moment(element.created_at).format("L")] = {
            ...tempGraphData[moment(element.created_at).format("L")],
            calibration_100: element.calibrationValue,
            calibration_50: 0.75 * Number(element.calibrationValue),
            calibration_25: 0.5 * Number(element.calibrationValue),
          }
        } else {
          tempGraphData[moment(element.created_at).format("L")] = {
            calibration_100: element.calibrationValue,
            calibration_50: 0.75 * element.calibrationValue,
            calibration_25: 0.5 * element.calibrationValue,
          };
        }
      }
    }

    for (const key in tempGraphData) {
      graphData.push({
        sessionDate: key,
        flowValue: tempGraphData[key].flowValue,
        ...(typeGraph) ? {
          calibration_100: tempGraphData[key].calibration_100,
          calibration_50: tempGraphData[key].calibration_50,
          calibration_25: tempGraphData[key].calibration_25,
        } : {}
      })
    }

    return graphData;
  } catch (error) {
    context.addNotification('error', extractMessage(error, ''));
  } finally {
    context.setLoading(false);
  }
}

const getMiniGameComparative = async (context, filters) => {
  context.setLoading(true);
  try {
    const GameToken = getTokenParameters('gameToken');
    const result = await axios.get(`${BaseUrl()}/minigames/statistics`,
      { params: { ...filters }, headers: { GameToken } }
    );

    //##################################################
    const comparativeMiniGames = (result.data.data) ? result.data.data : [];
    const flowDataSelectedPatient = [];
    const flowDataPatients = [];

    for (const element of comparativeMiniGames) {
      if (element.pacientId === context.patientId) {
        element.maxFlows.sort((first, second) => (first.sessionNumber > second.sessionNumber));
        flowDataSelectedPatient.push(element);
      } else {
        element.maxFlows.sort((first, second) => (first.sessionNumber >= second.sessionNumber) ? 1 : -1);
        flowDataPatients.push(element);
      }
    }
    // ajustar lógica de montagem dos dados
    //##################################################
    const flowData = { flows: {} };

    let flowDataPac = { sessoes: (flowDataSelectedPatient.length) ? flowDataSelectedPatient[0].maxFlows.length : 0, flows: [] };
    for (const element of flowDataPatients) {
      for (let index = 0; index < element.maxFlows.length; index++) {
        if (flowData.flows[index]) {
          flowData.flows[index] = [element.maxFlows[index].flow];
        } else {
          flowData.flows[index] = [flowData.flows[index], element.maxFlows[index].flow];
        }
      }
    }
    if (flowDataSelectedPatient.length) {
      for (let index = 0; index < flowDataSelectedPatient[0].maxFlows.length; index++) {
        flowDataPac.flows.push(flowDataSelectedPatient[0].maxFlows[index].flow);
      }
    }
    let quartilSuperiorExp = [];
    let quartilInferiorExp = [];
    for (const [key, value] of Object.entries(flowData.flows)) {
      value.sort(function (a, b) { return a - b; });
      quartilSuperiorExp.push(quantile(value, .75));
      quartilInferiorExp.push(quantile(value, .25));
    }
    for (let i = 1; i < quartilSuperiorExp.length - 1; i++) {
      if (!quartilSuperiorExp[i] && !!quartilSuperiorExp[i - 1]  && quartilSuperiorExp[i + 1]) {
        quartilSuperiorExp[i] = quartilSuperiorExp[i - 1] + quartilSuperiorExp[i + 1];
      };
    };
    for (let i = 1; i < quartilInferiorExp.length - 1; i++) {
      if (!quartilInferiorExp[i] && !!quartilInferiorExp[i - 1]  && !!quartilInferiorExp[i + 1]) {
        quartilInferiorExp[i] = quartilInferiorExp[i - 1] + quartilInferiorExp[i + 1];
      };
    };

    let teste = [];
    for (let i = 0; i < flowDataPac.sessoes; i++) {
      teste.push({
        xAxisPosition: i + 1,
        expectedValues_A: quartilInferiorExp[i] || 0,
        expectedValues_B: quartilInferiorExp[i] || 0,
        flowValue: flowDataPac.flows[i] || 0,
      })
    }

    // return teste;
    return [{}];
  } catch (error) {
    // console.log(error)
    // context.addNotification('error', extractMessage(error, ''));
    // throw 'erro';
    return [{}];
  } finally {
    context.setLoading(false);
  }
}
//##################################################
function quantile(array, quartile) {
  const pos = (array.length - 1) * quartile;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (array[base + 1] !== undefined) {
    return array[base] + rest * (array[base + 1] - array[base]);
  } else {
    return array[base];
  }
};
//##################################################

export {
  getGeneralStatisticsDataFromTheMiniGame,
  getMiniGameComparative,
};
