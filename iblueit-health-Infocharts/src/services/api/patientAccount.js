/* eslint-disable no-throw-literal */
import axios from 'axios';

import { BaseUrl } from '../../providers/_config';
import { getTokenParameters } from '../../providers/sessionStorage';

import { extractMessage } from '../../components/notification';


const getPatientAccount = async (context) => {
  context.setLoading(true);
  try {
    if(context.patientId){
      const GameToken = getTokenParameters('gameToken');
      const result = await axios.get(`${BaseUrl()}/pacients/${context.patientId}/account`, { headers: { GameToken } });
      return result.data.data
    }
    context.addNotification('error', 'Nenhum paciente selecionados')
    return null;
  } catch (error) {
    context.addNotification('error', extractMessage(error, ''));
    throw 'erro';
  } finally {
    context.setLoading(false);
  }
}

export {
  getPatientAccount,
};