import axios from 'axios';

import { BaseUrl } from '../../providers/_config';
import { getTokenParameters } from '../../providers/sessionStorage';
import { extractMessage } from '../../components/notification';


const fetchAll = async (context) => {
  context.setLoading(true);
  try {
    const GameToken = getTokenParameters('gameToken');
    const result = await axios.get(`${BaseUrl()}/pacients?sort=asc`, { headers: { GameToken } });
    return result.data.data.map((patient) => ({
      id: patient._id,
      name: patient.name,
      birthDate: patient.birthday,
    }));
  } catch (error) {
    context.addNotification('error', extractMessage(error, ''));
    throw 'erro';
  } finally {
    context.setLoading(false);
  }
}

export {
  fetchAll,
};