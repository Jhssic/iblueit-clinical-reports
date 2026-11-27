import axios from "axios";

import { BaseUrl } from "../../providers/_config";
import { getTokenParameters } from "../../providers/sessionStorage";

// Chave de API de IA própria do fisioterapeuta (Azure Function ManageLlmApiKey).
// O back-end nunca devolve a chave: só { configured, last4, updatedAt }.

const headers = () => ({ gametoken: getTokenParameters("gameToken") });
const URL = () => `${BaseUrl()}/account/llmkey`;

export const fetchLlmKeyStatus = async () => {
  const response = await axios.get(URL(), { headers: headers() });
  return response.data.data;
};

export const saveLlmKey = async (apiKey) => {
  const response = await axios.put(URL(), { apiKey }, { headers: headers() });
  return response.data;
};

export const deleteLlmKey = async () => {
  const response = await axios.delete(URL(), { headers: headers() });
  return response.data;
};
