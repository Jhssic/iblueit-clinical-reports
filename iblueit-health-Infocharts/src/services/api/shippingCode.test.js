import axios from "axios";
import { requestGenerateShippingCode } from "./shippingCode";
import { getTokenParameters } from "../../providers/sessionStorage";
import { buildContext, salvarCredenciais } from "../../testUtils/renderWithProviders";

jest.mock("axios");

const BASE = "http://localhost:7071/api";

describe("requestGenerateShippingCode (código de envio)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    salvarCredenciais();
  });

  it("gera um novo token a partir do userId e atualiza as credenciais salvas", async () => {
    const context = buildContext();
    axios.post.mockResolvedValue({ data: { data: { gameToken: "novo-token" } } });

    await requestGenerateShippingCode(context);

    expect(axios.post).toHaveBeenCalledWith(`${BASE}/token`, { userId: "user-1" });
    expect(getTokenParameters("gameToken")).toBe("novo-token");
    expect(getTokenParameters("userId")).toBe("user-1");
    expect(context.setLoading.mock.calls).toEqual([[true], [false]]);
  });

  it("notifica o erro, mantém o token anterior e lança exceção quando falha", async () => {
    const context = buildContext();
    axios.post.mockRejectedValue({ response: { data: { message: "Usuário inválido" } } });

    await expect(requestGenerateShippingCode(context)).rejects.toBe("erro");
    expect(context.addNotification).toHaveBeenCalledWith("error", "Usuário inválido");
    expect(getTokenParameters("gameToken")).toBe("token-123");
    expect(context.setLoading).toHaveBeenLastCalledWith(false);
  });
});
