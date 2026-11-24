import axios from "axios";
import { requestRegisterUsers } from "./signUp";
import { buildContext } from "../../testUtils/renderWithProviders";

jest.mock("axios");

const BASE = "http://localhost:7071/api";

describe("requestRegisterUsers (cadastro)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("envia os dados do usuário e notifica sucesso com a mensagem do servidor", async () => {
    const context = buildContext();
    const usuario = { fullname: "Dra. Ana", username: "ana", password: "123" };
    axios.post.mockResolvedValue({ data: { message: "Usuário cadastrado" } });

    await requestRegisterUsers(context, usuario);

    expect(axios.post).toHaveBeenCalledWith(`${BASE}/register`, usuario);
    expect(context.addNotification).toHaveBeenCalledWith("success", "Usuário cadastrado");
    expect(context.setLoading.mock.calls).toEqual([[true], [false]]);
  });

  it("notifica o erro e lança exceção quando o cadastro falha", async () => {
    const context = buildContext();
    axios.post.mockRejectedValue({ response: { data: { message: "Usuário já existe" } } });

    await expect(requestRegisterUsers(context, {})).rejects.toBe("erro");
    expect(context.addNotification).toHaveBeenCalledWith("error", "Usuário já existe");
    expect(context.setLoading).toHaveBeenLastCalledWith(false);
  });
});
