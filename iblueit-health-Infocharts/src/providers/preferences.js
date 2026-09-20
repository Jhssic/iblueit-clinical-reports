import 'moment/locale/pt-br'
import moment from 'moment-timezone';
import { registerLocale } from "react-datepicker";
import jstimezonedetect from 'jstimezonedetect';
import ptBR from "date-fns/locale/pt-BR";

export const setTimezone = () => {
  const tz = jstimezonedetect.determine();
  const timezone = tz.name() || 'America/Sao_Paulo';
  moment.tz.setDefault(timezone);
  moment.locale('pt-BR');
  registerLocale("ptBR", ptBR);
}