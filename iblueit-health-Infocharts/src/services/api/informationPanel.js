/* eslint-disable no-throw-literal */
import axios from 'axios';
import moment from "moment";

import { BaseUrl } from '../../providers/_config';
import { getTokenParameters } from '../../providers/sessionStorage';
import { extractMessage } from '../../components/notification';


const translateSex = (condition) => {
  if (condition === 'Male') return 'Masculino';
  return 'Feminino';
}

const translateCondition = (condition) => {
  if (condition === 'Obstructive') return 'Obstrutivo';
  if (condition === 'Healthy') return 'Saudável';
}

const getPatientInformation = async (context) => {
  context.setLoading(true);
  try {
    const GameToken = getTokenParameters('gameToken');
    const result = await axios.get(`${BaseUrl()}/pacients/${context.patientId}`, { headers: { GameToken } });
    const patientInformation = result.data.data;
    const newPatientData = [];
    if (patientInformation) {
      newPatientData.push({ fieldName: 'Nome', fieldValue: patientInformation.name })
      newPatientData.push({ fieldName: 'Sexo', fieldValue: translateSex(patientInformation.sex) })
      newPatientData.push({ fieldName: 'Condição', fieldValue: translateCondition(patientInformation.condition) })
      newPatientData.push({ fieldName: 'Data de Nascimento', fieldValue: moment(patientInformation.birthday).format("L") })
      newPatientData.push({ fieldName: 'Peso', fieldValue: `${patientInformation.weight} kg` })
      newPatientData.push({ fieldName: 'Altura', fieldValue: `${patientInformation.height}  cm` })
      newPatientData.push({ fieldName: 'Observações', fieldValue: patientInformation.observations === 'None' ? '-' : patientInformation.observations })
    }
    return newPatientData;
  } catch (error) {
    context.addNotification('error', extractMessage(error, ''));
    throw 'erro';
  } finally {
    context.setLoading(false);
  }
}

export {
  getPatientInformation,
};
