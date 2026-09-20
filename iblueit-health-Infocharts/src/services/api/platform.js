/* eslint-disable no-unused-vars */
/* eslint-disable no-throw-literal */
import axios from 'axios';

import { BaseUrl } from '../../providers/_config';
import { getTokenParameters } from '../../providers/sessionStorage';
import { extractMessage } from '../../components/notification';

const getPlatformComparative = async (context, filters, visualization) => {
  context.setLoading(true);
  try {
    const GameToken = getTokenParameters('gameToken');
    const result = await axios.get(`${BaseUrl()}/plataforms/statistics`,
      { params: { ...filters }, headers: { GameToken } }
    );

    //##################################################
    const comparativePlatform = result.data.data;
    const flowDataSelectedPatient = [];
    const flowDataPatients = [];

    for (const element of comparativePlatform) {
      if (element.pacientId === context.patientId) {
        element.maxFlowsPerSession.sort((first, second) => (first.sessionNumber > second.sessionNumber));
        flowDataSelectedPatient.push(element);
      } else {
        element.maxFlowsPerSession.sort((first, second) => (first.sessionNumber >= second.sessionNumber) ? 1 : -1);
        flowDataPatients.push(element);
      }
    }

    // ajustar lógica de montagem dos dados
    //##################################################
    let flowDataPac = { sessoes: (flowDataSelectedPatient[0].length) ? flowDataSelectedPatient[0].maxFlowsPerSession.length : 0, insFlows: [], expFlows: [], Score: [], ScoreRatio: [] };
    let flowData = { insFlows: {}, expFlows: {}, score: {}, scoreRatio: {} };

    for (const element of flowDataPatients) {
      for (let index = 0; index < element.maxFlowsPerSession.length; index++) {
        if (!flowData.expFlows[index]) {
          flowData.expFlows[index] = [];
        }
        if (!flowData.insFlows[index]) {
          flowData.insFlows[index] = [];
        }

        flowData.expFlows[index].push(element.maxFlowsPerSession[index].maxExpFlow);
        flowData.insFlows[index].push(element.maxFlowsPerSession[index].maxInsFlow);
      };

      flowData.score = element.plataformInfo.map(x => ({ fase: x.phase, level: x.level, value: x.maxScore }));
      flowData.scoreRatio = element.plataformInfo.map(x => ({ fase: x.phase, level: x.level, value: x.scoreRatio }));
    }

    if (!flowData.score[0]) { flowData.score = []; };
    //DADO FAKE COMPARATIVO SCORE
    //for(let i=0;i<30;i++){

    //   flowData.score.push({ fase: Math.floor((Math.random() * 3) + 1), level: Math.floor((Math.random() * 9) + 1), value: Math.floor((Math.random() * 1500) + 1)});
    // } //usando random para gerar dados aleatórios de fase, sessão e pontuação para comparação com o paciente analisado
    //fim dados fake

    if (!flowData.scoreRatio[0]) { flowData.scoreRatio = []; };
    //DADO FAKE COMPARATIVO RAZÂO
    //for(let i=0;i<30;i++){

    //     flowData.scoreRatio.push({ fase: Math.floor((Math.random() * 3) + 1), level: Math.floor((Math.random() * 9) + 1), value: Math.floor((Math.random() * 100))});
    // } //usando random para gerar dados aleatórios de fase, sessão e pontuação para comparação com o paciente analisado
    //fim dados fake

    if(flowDataSelectedPatient.length){
      for (let index = 0; index < flowDataSelectedPatient[0].maxFlowsPerSession.length; index++) {
        flowDataPac.expFlows.push(flowDataSelectedPatient[0].maxFlowsPerSession[index].maxExpFlow);
        flowDataPac.insFlows.push(flowDataSelectedPatient[0].maxFlowsPerSession[index].maxInsFlow);
  
        for (let i = 1; i <= 3; i++) {
          if (flowDataSelectedPatient[0].plataformInfo[index].phase === i) {
            for (let j = 1; j <= 9; j++) {
              if (flowDataSelectedPatient[0].plataformInfo[index].level === j) {
                let a = (9 * (i - 1)) + (j - 1);
                if (!flowDataPac.Score[a]) { flowDataPac.Score[a] = 0; };
                if (flowDataPac.Score[a] < flowDataSelectedPatient[0].plataformInfo[index].maxScore) {
                  flowDataPac.Score[a] = flowDataSelectedPatient[0].plataformInfo[index].maxScore;
                }
                if (!flowDataPac.ScoreRatio[a]) { flowDataPac.ScoreRatio[a] = 0; };
                if (flowDataPac.ScoreRatio[a] < 100 * flowDataSelectedPatient[0].plataformInfo[index].scoreRatio) {
                  flowDataPac.ScoreRatio[a] = 100 * flowDataSelectedPatient[0].plataformInfo[index].scoreRatio;
                }
              }
            }
          }
        }
      }
    }

    //alocando vetores com todos os dados separando por fase e por level, e então retirando a mediana destes valores
    let somascore = [];
    let scoreMediana = [];
    for (const element of flowData.score) {
      for (let i = 1; i <= 3; i++) {
        if (element.fase === i) {
          for (let j = 1; j <= 9; j++) {
            if (element.level === j) {
              let a = (9 * (i - 1)) + (j - 1);
              if (!somascore[a]) {
                somascore[a] = [];
                somascore[a].push(element.value);
              } else {
                somascore[a].push(element.value);
              }
              if (!scoreMediana[a]) {
                scoreMediana[a] = 0;
              }
              scoreMediana[a] = quartile(somascore[a], .50);
            }
          }
        }
      }
    }

    //como podem haver levels se dado algum (embora se espera que não aconteça), isso irá alocar valores nulos nessas posições dos
    //vetores, para que o highchart não plote os dados em posições erradas, e assim também limitando a apresentação do comparativo
    //ao tamanho dos dados do paciente.
    let scoreMedianautil = [];
    for (let a = 0; a < flowDataPac.Score.length; a++) {
      if (!scoreMediana[a]) {
        scoreMedianautil[a] = "";
      } else {
        scoreMedianautil[a] = scoreMediana[a];
      }
    }

    //alocando vetores com todos os dados separando por fase e por level, e então retirando a mediana destes valores
    let somascoreRatio = [];
    let scoreRatioMediana = [];
    for (const element of flowData.scoreRatio) {
      for (let i = 1; i <= 3; i++) {
        if (element.fase === i) {
          for (let j = 1; j <= 9; j++) {
            if (element.level === j) {
              let a = (9 * (i - 1)) + (j - 1);
              if (!somascoreRatio[a]) {
                somascoreRatio[a] = [];
                somascoreRatio[a].push(element.value);
              } else {
                somascoreRatio[a].push(element.value);
              }
              if (!scoreRatioMediana[a]) {
                scoreRatioMediana[a] = 0;
              }
              scoreRatioMediana[a] = quartile(somascoreRatio[a], .50);
            }
          }
        }
      }
    }

    //for(let i=0;i<5;i++){
    //flowDataPac.ScoreRatio.push((Math.random() * 100));}      //DADO FAKE PACIENTE RAZÂO

    //como podem haver levels se dado algum (embora se espera que não aconteça), isso irá alocar valores nulos nessas posições dos
    //vetores, para que o highchart não plote os dados em posições erradas, e assim também limitando a apresentação do comparativo
    //ao tamanho dos dados do paciente.
    let scoreRatioMedianautil = [];
    for (let a = 0; a < flowDataPac.ScoreRatio.length; a++) {
      if (!scoreRatioMediana[a]) {
        scoreRatioMedianautil[a] = "";
      } else {
        scoreRatioMedianautil[a] = scoreRatioMediana[a];
      }
    }

    let quartilSuperiorExp = [];
    let quartilInferiorExp = [];
    let quartilSuperiorIns = [];
    let quartilInferiorIns = [];
    for (const [key, value] of Object.entries(flowData.expFlows)) {
      value.sort(function (a, b) { return a - b; });
      quartilSuperiorExp.push(quartile(value, .75));
      quartilInferiorExp.push(quartile(value, .25));
    }

    for (const [key, value] of Object.entries(flowData.insFlows)) {
      value.sort(function (a, b) { return a - b; });
      quartilSuperiorIns.push(quartile(value, .75));
      quartilInferiorIns.push(quartile(value, .25));
    }

    for (let i = 1; i < quartilSuperiorExp.length - 1; i++) {
      if (!quartilSuperiorExp[i] && !!quartilSuperiorExp[i - 1] && !!quartilSuperiorExp[i + 1]) {
        quartilSuperiorExp[i] = quartilSuperiorExp[i - 1] + quartilSuperiorExp[i + 1];
      };
    };
    for (let i = 1; i < quartilInferiorExp.length - 1; i++) {
      if (!quartilInferiorExp[i] && !!quartilInferiorExp[i - 1] && !!quartilInferiorExp[i + 1]) {
        quartilInferiorExp[i] = quartilInferiorExp[i - 1] + quartilInferiorExp[i + 1];
      };
    };

    for (let i = 1; i < quartilSuperiorIns.length - 1; i++) {
      if (!quartilSuperiorIns[i] && !!quartilSuperiorIns[i - 1] && !!quartilSuperiorIns[i + 1]) {
        quartilSuperiorIns[i] = quartilSuperiorIns[i - 1] + quartilSuperiorIns[i + 1];
      };
    };
    for (let i = 1; i < quartilInferiorIns.length - 1; i++) {
      if (!quartilInferiorIns[i] && !!quartilInferiorIns[i - 1] && !!quartilInferiorIns[i + 1]) {
        quartilInferiorIns[i] = quartilInferiorIns[i - 1] + quartilInferiorIns[i + 1];
      };
    };

    const teste = [];
    for (let i = 0; i < flowDataPac.sessoes; i++) {
      teste.push({
        xAxisPosition: i + 1,
        expectedValues_A_Exp: quartilInferiorExp[i],
        expectedValues_B_Exp: quartilSuperiorExp[i],
        expectedValues_A_Ins: quartilInferiorIns[i],
        expectedValues_B_Ins: quartilSuperiorIns[i],
        flowValue_Exp: flowDataPac.expFlows[i],
        flowValue_Ins: flowDataPac.insFlows[i],
      })
    }

    // case 'expiratory_peak':
    //   plotObj = {

    //     areaRange: areaRangeExpValues,
    //     values: playerLineExpValues,
    //   };
    //   break;

    // case 'inspiratory_peak':
    //   plotObj = {

    //     areaRange: areaRangeExpValues,
    //     values: playerLineInsValues,
    //   };
    //   break;

    // case 'score':

    //   plotObj = {

    //     scorecomp: scoreMedianautil,
    //     values: flowDataPac.Score,
    //     yTitleText: "Pontuação",
    //     namecompmax: "Comparativo Pontuação Máxima",
    //     pacientCompSerieName: "Pontuação Comum de Pacientes Selecionados",
    //     yLabel: "Pontos",
    //     maxyaxis: null,
    //     passoy: null,
    //     PosFlagY: 50,
    //   };


    // case 'ratio':
    //   plotObj = {
    //     scorecomp: scoreRatioMedianautil,
    //     values: flowDataPac.ScoreRatio,
    //     yTitleText: "Porcentagem (%)",
    //     namecompmax: "Porcentagem máxima",
    //     pacientCompSerieName: "Razão Comum de Pacientes Selecionados",
    //     yLabel: "%",
    //     maxyaxis: 100,
    //     passoy: 25,
    //     PosFlagY: 0,
    //   };
    //   for (let i = 0; i < plotObj.values.length; i++) {
    //     maxscoredatautil[i] = 100;
    //   } //razão máxima é sempre o 100%

    //   plotObj.maxscoredata = maxscoredatautil;  //há necessidade de comparar com o máximo em Razão????
    //   break;



    // if ($("#plataform-view").val() == 'expiratory_peak' || $("#plataform-view").val() == 'inspiratory_peak') {

    //   switch ($("#device-name").val()) {


    //   plot(plotObj);
    // }

    // if ($("#plataform-view").val() == 'score' || $("#plataform-view").val() == 'ratio') {

    //   plotbar(plotObj);
    // }

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
function quartile(array, quartile) {
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
  getPlatformComparative
};



// series: [{
//   name: plotObj.seriesLineName,
//   data: plotObj.values,
// },
// {
//   name: plotObj.pacientCompSerieName,
//   data: plotObj.scorecomp,
// },
// {
//   name: plotObj.namecompmax,
//   data: plotObj.maxscoredata,
//   color: '#ff0303'
// }],
