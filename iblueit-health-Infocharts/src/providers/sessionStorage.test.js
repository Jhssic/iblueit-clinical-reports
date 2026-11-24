import {
  saveAuthenticationData,
  removerAuthenticationData,
  isAuthenticated,
  getTokenParameters,
  updateAuthenticationData,
} from "./sessionStorage";

const credenciaisValidas = {
  fullname: "Dra. Teste",
  gameToken: "token-123",
  userId: "user-1",
  authExpirationTime: 100,
  authTime: 1,
};

describe("sessionStorage (credenciais do usuário)", () => {
  beforeEach(() => sessionStorage.clear());

  it("salva os dados da resposta de login no sessionStorage", () => {
    saveAuthenticationData({ data: { data: credenciaisValidas } });
    expect(JSON.parse(sessionStorage.getItem("userCredentials"))).toEqual(credenciaisValidas);
  });

  it("salva string vazia quando a resposta não tem dados", () => {
    saveAuthenticationData({});
    expect(sessionStorage.getItem("userCredentials")).toBe("");
  });

  it("considera autenticado apenas quando todas as chaves obrigatórias existem", () => {
    expect(isAuthenticated()).toBe(false);
    sessionStorage.setItem("userCredentials", JSON.stringify({ fullname: "x" }));
    expect(isAuthenticated()).toBe(false);
    sessionStorage.setItem("userCredentials", JSON.stringify(credenciaisValidas));
    expect(isAuthenticated()).toBe(true);
  });

  it("lê um parâmetro específico ou o objeto inteiro", () => {
    sessionStorage.setItem("userCredentials", JSON.stringify(credenciaisValidas));
    expect(getTokenParameters("gameToken")).toBe("token-123");
    expect(getTokenParameters()).toEqual(credenciaisValidas);
  });

  it("atualiza um parâmetro mantendo os demais", () => {
    sessionStorage.setItem("userCredentials", JSON.stringify(credenciaisValidas));
    updateAuthenticationData("fullname", "Novo Nome");
    expect(getTokenParameters()).toEqual({ ...credenciaisValidas, fullname: "Novo Nome" });
  });

  it("remove todos os dados ao sair", () => {
    sessionStorage.setItem("userCredentials", JSON.stringify(credenciaisValidas));
    removerAuthenticationData();
    expect(sessionStorage.getItem("userCredentials")).toBeNull();
  });
});
