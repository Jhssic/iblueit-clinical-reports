/* eslint-disable no-throw-literal */
import axios from 'axios';
import moment from "moment";

import { BaseUrl } from '../../providers/_config';
import { getTokenParameters } from '../../providers/sessionStorage';
import { extractMessage } from '../../components/notification';
import { translateSex, translateCondition } from '../../utils/patientLabels';


const getPatientInformation = async (context) => {
  context.setLoading(true);
  try {
    const GameToken = getTokenParameters('gameToken');
    const result = await axios.get(`${BaseUrl()}/pacients/${context.patientId}`, { headers: { GameToken } });
    const patientInformation = result.data.data;
    const newPatientData = [];
    if (patientInformation) {
      newPatientData.push(
        { fieldName: 'Nome', fieldValue: patientInformation.name },
        { fieldName: 'Sexo', fieldValue: translateSex(patientInformation.sex) || '-' },
        { fieldName: 'Condição', fieldValue: translateCondition(patientInformation.condition) || '-' },
        { fieldName: 'Data de Nascimento', fieldValue: moment(patientInformation.birthday).format("L") },
        { fieldName: 'Peso', fieldValue: `${patientInformation.weight} kg` },
        { fieldName: 'Altura', fieldValue: `${patientInformation.height}  cm` },
        { fieldName: 'Observações', fieldValue: patientInformation.observations === 'None' ? '-' : patientInformation.observations },
      );
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
