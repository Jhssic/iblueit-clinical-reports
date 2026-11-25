import axios from 'axios';

import { BaseUrl } from '../../providers/_config';
import { getTokenParameters } from '../../providers/sessionStorage';

// O comparativo entre pacientes ainda não é montado a partir dos dados do servidor: o gráfico
// usa dados de exemplo, então o serviço apenas consulta as estatísticas e devolve um placeholder.
const getPlatformComparative = async (context, filters) => {
  context.setLoading(true);
  try {
    const GameToken = getTokenParameters('gameToken');
    await axios.get(`${BaseUrl()}/plataforms/statistics`,
      { params: { ...filters }, headers: { GameToken } }
    );
  } catch (error) {
    // Falhas não interrompem a tela: o comparativo segue exibindo os dados de exemplo.
    console.error(error);
  } finally {
    context.setLoading(false);
  }
  return [{}];
}

export {
  getPlatformComparative
};
