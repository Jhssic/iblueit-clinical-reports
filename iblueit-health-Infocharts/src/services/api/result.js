import axios from "axios";
import moment from "moment";

import { BaseUrl } from '../../providers/_config';
import { getTokenParameters } from '../../providers/sessionStorage';

const fetchResults = async (patientId, device, visualization) => {
  const gameToken = getTokenParameters('gameToken');

  try {
    const response = await axios.get(
      `${BaseUrl()}/pacients/${patientId}/plataforms/statistics?sort=asc&gameDevice=${device}`,
      {
        headers: { gameToken },
      }
    );

    return response.data.data.map((patientResult) => ({
      date: moment(patientResult.playFinish).format("DD/MM/YY"),
      value: patientResult[visualization],
    }));
  } catch (error) {
    console.log(error);
    return [];
  }
};

const fetchPointsAndLevelsAndPlays = async (patientId) => {
  const gameToken = getTokenParameters('gameToken');

  try {
    const response = await axios.get(
      `${BaseUrl()}/pacients/${patientId}`,
      {
        headers: { gameToken },
      }
    );

    const data = response.data.data;

    return [
      {
        value: data.accumulatedScore,
        title: "Pontuação acumulada",
      },
      {
        value: data.unlockedLevels,
        title: "Níveis desbloqueados",
      },
      {
        value: data.playSessionsDone,
        title: "Seções jogadas",
      },
    ];
  } catch (error) {
    console.log(error);
  }
};

export { fetchResults, fetchPointsAndLevelsAndPlays };
