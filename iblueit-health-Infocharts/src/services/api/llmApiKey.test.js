import axios from "axios";
import { fetchLlmKeyStatus, saveLlmKey, deleteLlmKey } from "./llmApiKey";
import { BaseUrl } from "../../providers/_config";

jest.mock("axios");

const URL = `${BaseUrl()}/account/llmkey`;
const HEADERS = { headers: { gametoken: "token-123" } };

describe("services/api/llmApiKey", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.setItem("userCredentials", JSON.stringify({ gameToken: "token-123" }));
  });

  it("fetchLlmKeyStatus faz GET e devolve o status", async () => {
    axios.get.mockResolvedValue({ data: { data: { configured: true, last4: "abcd" } } });
    expect(await fetchLlmKeyStatus()).toEqual({ configured: true, last4: "abcd" });
    expect(axios.get).toHaveBeenCalledWith(URL, HEADERS);
  });

  it("saveLlmKey faz PUT com a chave", async () => {
    axios.put.mockResolvedValue({ data: { success: true } });
    expect(await saveLlmKey("gsk_123")).toEqual({ success: true });
    expect(axios.put).toHaveBeenCalledWith(URL, { apiKey: "gsk_123" }, HEADERS);
  });

  it("deleteLlmKey faz DELETE", async () => {
    axios.delete.mockResolvedValue({ data: { success: true } });
    expect(await deleteLlmKey()).toEqual({ success: true });
    expect(axios.delete).toHaveBeenCalledWith(URL, HEADERS);
  });
});
