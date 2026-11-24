import axios from "axios";
import { fetchGameParameterNeighbor, createGameParameter, getGameParameter } from "./gameParameterNeighbor";
import { buildContext, salvarCredenciais } from "../../testUtils/renderWithProviders";

jest.mock("axios");

const BASE = "http://localhost:7071/api";
const headersEsperados = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

describe("serviço de vizinhos de parâmetros do jogo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    salvarCredenciais();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => console.log.mockRestore());

  it("fetchGameParameterNeighbor consulta os vizinhos do paciente", async () => {
    const resposta = { data: { data: { neighbors: [] } } };
    axios.get.mockResolvedValue(resposta);

    await expect(fetchGameParameterNeighbor("p1")).resolves.toBe(resposta);
    expect(axios.get).toHaveBeenCalledWith(`${BASE}/gameParameterNeighborInformation`, {
      headers: { gameToken: "token-123", ...headersEsperados },
      params: { pacientId: "p1" },
    });
  });

  it("fetchGameParameterNeighbor retorna lista vazia em caso de erro", async () => {
    axios.get.mockRejectedValue(new Error("falha"));
    await expect(fetchGameParameterNeighbor("p1")).resolves.toEqual([]);
    expect(console.log).toHaveBeenCalled();
  });

  it("getGameParameter usa o header gametoken e o pacientId como parâmetro", async () => {
    axios.get.mockResolvedValue({ data: 1 });
    await expect(getGameParameter("p2")).resolves.toEqual({ data: 1 });
    expect(axios.get).toHaveBeenCalledWith(`${BASE}/gameparameter`, {
      headers: { gametoken: "token-123", ...headersEsperados },
      params: { pacientId: "p2" },
    });
  });

  it("getGameParameter retorna lista vazia em caso de erro", async () => {
    axios.get.mockRejectedValue(new Error("falha"));
    await expect(getGameParameter("p2")).resolves.toEqual([]);
  });

  it("createGameParameter envia o corpo com o pacientId nos parâmetros e controla o loading", async () => {
    const context = buildContext();
    const corpo = { ObjectSpeedFactor: 3 };
    axios.post.mockResolvedValue({ status: 201 });

    await expect(createGameParameter("p3", context, corpo)).resolves.toEqual({ status: 201 });
    expect(axios.post).toHaveBeenCalledWith(`${BASE}/gameparameter`, corpo, {
      headers: { gameToken: "token-123", ...headersEsperados },
      params: { pacientId: "p3" },
    });
    expect(context.setLoading.mock.calls).toEqual([[true], [false]]);
  });

  it("createGameParameter retorna lista vazia em caso de erro", async () => {
    const context = buildContext();
    axios.post.mockRejectedValue(new Error("falha"));
    await expect(createGameParameter("p3", context, {})).resolves.toEqual([]);
    expect(context.setLoading).toHaveBeenLastCalledWith(false);
  });
});
