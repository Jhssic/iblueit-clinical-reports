/* eslint-disable no-throw-literal */
import axios from 'axios';

import { BaseUrl } from '../../providers/_config';
import { extractMessage } from '../../components/notification';
import {
  getTokenParameters, updateAuthenticationData
} from '../../providers/sessionStorage';


const requestGenerateShippingCode = async (context) => {
  context.setLoading(true);
  try {
    const userId = await getTokenParameters('userId');
    const result = await axios.post(`${BaseUrl()}/token`, { userId });
    updateAuthenticationData('gameToken', result.data.data.gameToken);
  } catch (error) {
    context.addNotification('error', extractMessage(error, ''));
    throw 'erro';
  } finally {
    context.setLoading(false);
  }
}

export {
  requestGenerateShippingCode,
};