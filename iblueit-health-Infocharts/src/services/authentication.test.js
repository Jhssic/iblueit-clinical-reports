import axios from "axios";
import { postAuthentication } from "./authentication";
import { buildContext } from "../testUtils/renderWithProviders";

jest.mock("axios");

const BASE = "http://localhost:7071/api";

describe("postAuthentication (login)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  it("envia usuário e senha, salva as credenciais e controla o loading", async () => {
    const context = buildContext();
    const credenciais = { fullname: "Dra", gameToken: "t", userId: "u", authExpirationTime: 1, authTime: 1 };
    axios.post.mockResolvedValue({ data: { data: credenciais } });

    await postAuthentication(context, "dra", "senha");

    expect(axios.post).toHaveBeenCalledWith(`${BASE}/login`, { username: "dra", password: "senha" });
    expect(JSON.parse(sessionStorage.getItem("userCredentials"))).toEqual(credenciais);
    expect(context.setLoading).toHaveBeenNthCalledWith(1, true);
    expect(context.setLoading).toHaveBeenLastCalledWith(false);
    expect(context.addNotification).not.toHaveBeenCalled();
  });

  it("notifica 'Usuário ou senha incorretos' e lança erro quando o servidor recusa", async () => {
    const context = buildContext();
    axios.post.mockRejectedValue({ response: { data: { message: "Unauthorized" } } });

    await expect(postAuthentication(context, "x", "y")).rejects.toThrow("Usuário ou senha incorretos");
    expect(context.addNotification).toHaveBeenCalledWith("error", "Usuário ou senha incorretos");
    expect(context.setLoading).toHaveBeenLastCalledWith(false);
    expect(sessionStorage.getItem("userCredentials")).toBeNull();
  });

  it("notifica falha de conexão quando não há resposta do servidor", async () => {
    const context = buildContext();
    axios.post.mockRejectedValue(new Error("Network Error"));

    await expect(postAuthentication(context, "x", "y")).rejects.toThrow(/Impossível fazer conexão/);
    expect(context.addNotification).toHaveBeenCalledWith("error", expect.stringMatching(/Impossível fazer conexão/));
  });
});
