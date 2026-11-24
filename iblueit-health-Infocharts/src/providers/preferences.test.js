import moment from "moment-timezone";
import jstimezonedetect from "jstimezonedetect";
import { registerLocale } from "react-datepicker";
import { setTimezone } from "./preferences";

jest.mock("react-datepicker", () => ({ registerLocale: jest.fn() }));

describe("setTimezone (preferências de fuso e idioma)", () => {
  afterEach(() => jest.restoreAllMocks());

  it("usa o fuso detectado no navegador e registra o locale pt-BR", () => {
    jest.spyOn(jstimezonedetect, "determine").mockReturnValue({ name: () => "America/Manaus" });
    const setDefault = jest.spyOn(moment.tz, "setDefault");
    setTimezone();
    expect(setDefault).toHaveBeenCalledWith("America/Manaus");
    expect(moment.locale()).toBe("pt-br");
    expect(registerLocale).toHaveBeenCalledWith("ptBR", expect.any(Object));
  });

  it("cai para America/Sao_Paulo quando o fuso não é detectado", () => {
    jest.spyOn(jstimezonedetect, "determine").mockReturnValue({ name: () => undefined });
    const setDefault = jest.spyOn(moment.tz, "setDefault");
    setTimezone();
    expect(setDefault).toHaveBeenCalledWith("America/Sao_Paulo");
  });
});
