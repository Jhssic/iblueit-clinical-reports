import axios from "axios";
import { fetchAll } from "./patient";
import { buildContext, salvarCredenciais } from "../../testUtils/renderWithProviders";

jest.mock("axios");

const BASE = "http://localhost:7071/api";

describe("fetchAll (lista de pacientes)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    salvarCredenciais();
  });

  it("busca os pacientes ordenados e mapeia os campos usados pela tela", async () => {
    const context = buildContext();
    axios.get.mockResolvedValue({
      data: {
        data: [
          { _id: "1", name: "Ana", birthday: "2000-01-01", condition: "Healthy", latestReport: { status: "estavel" } },
          { _id: "2", name: "Bia", birthday: "1999-02-02", condition: "Obstructive" },
        ],
      },
    });

    const pacientes = await fetchAll(context);

    expect(axios.get).toHaveBeenCalledWith(`${BASE}/pacients?sort=asc`, { headers: { GameToken: "token-123" } });
    expect(pacientes).toEqual([
      { id: "1", name: "Ana", birthDate: "2000-01-01", condition: "Healthy", latestReport: { status: "estavel" } },
      { id: "2", name: "Bia", birthDate: "1999-02-02", condition: "Obstructive", latestReport: null },
    ]);
    expect(context.setLoading.mock.calls).toEqual([[true], [false]]);
  });

  it("notifica o erro e lança exceção quando a requisição falha", async () => {
    const context = buildContext();
    axios.get.mockRejectedValue({ response: { data: { message: "Token inválido" } } });

    await expect(fetchAll(context)).rejects.toEqual(new Error("erro"));
    expect(context.addNotification).toHaveBeenCalledWith("error", "Token inválido");
    expect(context.setLoading).toHaveBeenLastCalledWith(false);
  });
});
