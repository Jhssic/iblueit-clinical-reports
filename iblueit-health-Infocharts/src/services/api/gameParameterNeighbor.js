import axios from "axios";

import { BaseUrl } from '../../providers/_config';
import { getTokenParameters } from '../../providers/sessionStorage';

const fetchGameParameterNeighbor = async (pacientId) => {
  const gameToken = getTokenParameters('gameToken');
  try {
    const result = await axios.get(`${BaseUrl()}/gameParameterNeighborInformation`, {
      headers: { 
        gameToken,
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': "*"
      },
      params: {
        pacientId: pacientId
      }
    });
    // TODO: FAZER UM CATCH AQUI PARA QUANDO NAO TIVER VIZINHOS
    return result;
  } catch (error) {
    console.log(error);
    return []
  }
};

const getGameParameter = async (pacientId) => {
  const gameToken = getTokenParameters('gameToken');
  try {
    const result = await axios.get(`${BaseUrl()}/gameparameter`, {
      headers: { 
        "gametoken": gameToken,
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': "*"
      },
      params: {
        pacientId: pacientId
      }
    });
    // TODO: FAZER UM CATCH AQUI PARA QUANDO NAO TIVER VIZINHOS
    return result;
  } catch (error) {
    console.log(error);
    return []
  }
};

const createGameParameter = async (pacientId, context, gameParameter) => {
  context.setLoading(true);
  const gameToken = getTokenParameters('gameToken');
  try {
    const result = await axios.post(`${BaseUrl()}/gameparameter`, gameParameter, {
      headers: { 
        gameToken,
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': "*"
      },
      params: {
        pacientId: pacientId
      }
    });
    return result;
  } catch (error) {
    return []
  } finally {
    context.setLoading(false);
  }
}

export { fetchGameParameterNeighbor, createGameParameter, getGameParameter };
