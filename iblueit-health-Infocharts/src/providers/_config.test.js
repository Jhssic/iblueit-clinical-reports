import { BaseUrl } from "./_config";

describe("BaseUrl (endereço da API)", () => {
  const original = process.env.REACT_APP_BASE_URL_I_BLUE_IT;
  afterEach(() => {
    if (original === undefined) delete process.env.REACT_APP_BASE_URL_I_BLUE_IT;
    else process.env.REACT_APP_BASE_URL_I_BLUE_IT = original;
  });

  it("usa a variável de ambiente quando definida", () => {
    process.env.REACT_APP_BASE_URL_I_BLUE_IT = "https://api.exemplo.com/api";
    expect(BaseUrl()).toBe("https://api.exemplo.com/api");
  });

  it("usa o endereço local do Azure Functions por padrão", () => {
    delete process.env.REACT_APP_BASE_URL_I_BLUE_IT;
    expect(BaseUrl()).toBe("http://localhost:7071/api");
  });
});
