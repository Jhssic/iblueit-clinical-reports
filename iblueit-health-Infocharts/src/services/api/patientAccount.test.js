import axios from "axios";
import { getPatientAccount } from "./patientAccount";
import { buildContext, salvarCredenciais } from "../../testUtils/renderWithProviders";

jest.mock("axios");

const BASE = "http://localhost:7071/api";

describe("getPatientAccount (conta do paciente)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    salvarCredenciais();
  });

  it("busca a conta do paciente selecionado", async () => {
    const context = buildContext({ patientId: "p7" });
    axios.get.mockResolvedValue({ data: { data: { username: "joao" } } });

    await expect(getPatientAccount(context)).resolves.toEqual({ username: "joao" });
    expect(axios.get).toHaveBeenCalledWith(`${BASE}/pacients/p7/account`, { headers: { GameToken: "token-123" } });
    expect(context.setLoading.mock.calls).toEqual([[true], [false]]);
  });

  it("avisa quando nenhum paciente está selecionado e não chama a API", async () => {
    const context = buildContext({ patientId: undefined });

    await expect(getPatientAccount(context)).resolves.toBeNull();
    expect(axios.get).not.toHaveBeenCalled();
    expect(context.addNotification).toHaveBeenCalledWith("error", "Nenhum paciente selecionados");
  });

  it("notifica o erro e lança exceção quando a requisição falha", async () => {
    const context = buildContext();
    axios.get.mockRejectedValue(new Error("Network Error"));

    await expect(getPatientAccount(context)).rejects.toBe("erro");
    expect(context.addNotification).toHaveBeenCalledWith("error", expect.stringMatching(/Impossível fazer conexão/));
    expect(context.setLoading).toHaveBeenLastCalledWith(false);
  });
});
