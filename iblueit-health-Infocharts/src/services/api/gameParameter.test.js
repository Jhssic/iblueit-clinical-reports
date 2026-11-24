import axios from "axios";
import { createGameParameter, getGameParameter } from "./gameParameter";
import { buildContext, salvarCredenciais } from "../../testUtils/renderWithProviders";

jest.mock("axios");

const BASE = "http://localhost:7071/api";
const headersEsperados = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

describe("serviço de parâmetros do jogo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    salvarCredenciais();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => console.log.mockRestore());

  it("getGameParameter busca os parâmetros do paciente com o token no header", async () => {
    const resposta = { data: { data: [{ ObjectSpeedFactor: 1 }] } };
    axios.get.mockResolvedValue(resposta);

    await expect(getGameParameter("p1")).resolves.toBe(resposta);
    expect(axios.get).toHaveBeenCalledWith(`${BASE}/gameparameter`, {
      headers: { gametoken: "token-123", ...headersEsperados },
      params: { pacientId: "p1" },
    });
  });

  it("getGameParameter retorna lista vazia em caso de erro", async () => {
    axios.get.mockRejectedValue(new Error("falha"));
    await expect(getGameParameter("p1")).resolves.toEqual([]);
  });

  it("createGameParameter envia o corpo e controla o loading", async () => {
    const context = buildContext();
    const corpo = { pacientId: "p1", ObjectSpeedFactor: 2 };
    axios.post.mockResolvedValue({ status: 201 });

    await expect(createGameParameter(context, corpo)).resolves.toEqual({ status: 201 });
    expect(axios.post).toHaveBeenCalledWith(`${BASE}/gameparameter`, corpo, {
      headers: { gameToken: "token-123", ...headersEsperados },
    });
    expect(context.setLoading.mock.calls).toEqual([[true], [false]]);
  });

  it("createGameParameter retorna lista vazia e desliga o loading em caso de erro", async () => {
    const context = buildContext();
    axios.post.mockRejectedValue(new Error("falha"));

    await expect(createGameParameter(context, {})).resolves.toEqual([]);
    expect(context.setLoading).toHaveBeenLastCalledWith(false);
  });
});
