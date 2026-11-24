import axios from "axios";
import moment from "moment";
import { getPatientInformation } from "./informationPanel";
import { buildContext, salvarCredenciais } from "../../testUtils/renderWithProviders";

jest.mock("axios");

const BASE = "http://localhost:7071/api";

const paciente = {
  name: "João",
  sex: "Male",
  condition: "Obstructive",
  birthday: "1990-05-10",
  weight: 70,
  height: 175,
  observations: "Asma leve",
};

describe("getPatientInformation (painel de informações)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    salvarCredenciais();
  });

  it("busca o paciente do contexto e traduz os campos para exibição", async () => {
    const context = buildContext({ patientId: "p1" });
    axios.get.mockResolvedValue({ data: { data: paciente } });

    const dados = await getPatientInformation(context);

    expect(axios.get).toHaveBeenCalledWith(`${BASE}/pacients/p1`, { headers: { GameToken: "token-123" } });
    expect(dados).toEqual([
      { fieldName: "Nome", fieldValue: "João" },
      { fieldName: "Sexo", fieldValue: "Masculino" },
      { fieldName: "Condição", fieldValue: "Obstrutivo" },
      { fieldName: "Data de Nascimento", fieldValue: moment("1990-05-10").format("L") },
      { fieldName: "Peso", fieldValue: "70 kg" },
      { fieldName: "Altura", fieldValue: "175  cm" },
      { fieldName: "Observações", fieldValue: "Asma leve" },
    ]);
    expect(context.setLoading.mock.calls).toEqual([[true], [false]]);
  });

  it("traduz sexo feminino, condição saudável e observação 'None' como '-'", async () => {
    const context = buildContext();
    axios.get.mockResolvedValue({
      data: { data: { ...paciente, sex: "Female", condition: "Healthy", observations: "None" } },
    });

    const dados = await getPatientInformation(context);
    const porCampo = Object.fromEntries(dados.map((d) => [d.fieldName, d.fieldValue]));

    expect(porCampo.Sexo).toBe("Feminino");
    expect(porCampo["Condição"]).toBe("Saudável");
    expect(porCampo["Observações"]).toBe("-");
  });

  it("retorna lista vazia quando o paciente não é encontrado", async () => {
    axios.get.mockResolvedValue({ data: { data: null } });
    await expect(getPatientInformation(buildContext())).resolves.toEqual([]);
  });

  it("notifica o erro e lança exceção quando a requisição falha", async () => {
    const context = buildContext();
    axios.get.mockRejectedValue({ response: { data: { message: "Paciente inexistente" } } });

    await expect(getPatientInformation(context)).rejects.toBe("erro");
    expect(context.addNotification).toHaveBeenCalledWith("error", "Paciente inexistente");
    expect(context.setLoading).toHaveBeenLastCalledWith(false);
  });
});
