import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import LlmKeyDialog from "./index";
import { renderWithProviders } from "../../testUtils/renderWithProviders";
import { fetchLlmKeyStatus, saveLlmKey, deleteLlmKey } from "../../services/api/llmApiKey";

jest.mock("../../services/api/llmApiKey");

const SEM_CHAVE = { configured: false, last4: null, updatedAt: null };
const COM_CHAVE = { configured: true, last4: "9876", updatedAt: "2026-11-01T12:00:00Z" };

const renderizar = (props = {}) =>
  renderWithProviders(<LlmKeyDialog open onClose={jest.fn()} {...props} />);

describe("<LlmKeyDialog /> (configuração da chave de IA)", () => {
  beforeEach(() => jest.resetAllMocks());

  it("sem chave configurada informa que usa a configuração padrão", async () => {
    fetchLlmKeyStatus.mockResolvedValue(SEM_CHAVE);
    renderizar();
    expect(await screen.findByText(/Nenhuma chave própria configurada/)).toBeInTheDocument();
    expect(screen.queryByText("Remover chave")).not.toBeInTheDocument();
    expect(screen.getByText("Salvar")).toBeDisabled();
  });

  it("com chave configurada mostra só os 4 últimos caracteres e a data", async () => {
    fetchLlmKeyStatus.mockResolvedValue(COM_CHAVE);
    renderizar();
    expect(await screen.findByText(/••••9876/)).toBeInTheDocument();
    expect(screen.getByText(/01\/11\/2026/)).toBeInTheDocument();
    expect(screen.getByLabelText("chave de API de IA")).toHaveValue("");
  });

  it("campo começa oculto e alterna para visível", async () => {
    fetchLlmKeyStatus.mockResolvedValue(SEM_CHAVE);
    renderizar();
    const campo = screen.getByLabelText("chave de API de IA");
    expect(campo).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByLabelText("mostrar chave"));
    expect(campo).toHaveAttribute("type", "text");
    await screen.findByText(/Nenhuma chave própria/);
  });

  it("salva a chave sem espaços nas pontas, atualiza o status e limpa o campo", async () => {
    fetchLlmKeyStatus.mockResolvedValue(SEM_CHAVE);
    saveLlmKey.mockResolvedValue({ message: "Chave de IA salva com sucesso.", data: COM_CHAVE });
    const { context } = renderizar();
    await screen.findByText(/Nenhuma chave própria/);

    const campo = screen.getByLabelText("chave de API de IA");
    fireEvent.change(campo, { target: { value: "  gsk_nova_chave_9876  " } });
    fireEvent.click(screen.getByText("Salvar"));

    await waitFor(() => expect(saveLlmKey).toHaveBeenCalledWith("gsk_nova_chave_9876"));
    expect(await screen.findByText(/••••9876/)).toBeInTheDocument();
    expect(campo).toHaveValue("");
    expect(context.addNotification).toHaveBeenCalledWith("success", "Chave de IA salva com sucesso.");
  });

  it("mostra o erro do servidor quando a chave é recusada", async () => {
    fetchLlmKeyStatus.mockResolvedValue(SEM_CHAVE);
    saveLlmKey.mockRejectedValue({ response: { data: { message: "Chave de IA inválida." } } });
    const { context } = renderizar();
    await screen.findByText(/Nenhuma chave própria/);

    fireEvent.change(screen.getByLabelText("chave de API de IA"), { target: { value: "curta" } });
    fireEvent.click(screen.getByText("Salvar"));

    await waitFor(() => expect(context.addNotification).toHaveBeenCalledWith("error", "Chave de IA inválida."));
  });

  it("remove a chave configurada", async () => {
    fetchLlmKeyStatus.mockResolvedValue(COM_CHAVE);
    deleteLlmKey.mockResolvedValue({ message: "Chave de IA removida.", data: SEM_CHAVE });
    const { context } = renderizar();

    fireEvent.click(await screen.findByText("Remover chave"));

    expect(await screen.findByText(/Nenhuma chave própria configurada/)).toBeInTheDocument();
    expect(deleteLlmKey).toHaveBeenCalled();
    expect(context.addNotification).toHaveBeenCalledWith("success", "Chave de IA removida.");
  });

  it("notifica erro se não conseguir carregar o status", async () => {
    fetchLlmKeyStatus.mockRejectedValue({ response: { data: { message: "Chave de acesso inválida." } } });
    const { context } = renderizar();
    await waitFor(() => expect(context.addNotification).toHaveBeenCalledWith("error", "Chave de acesso inválida."));
  });

  it("não carrega nada enquanto está fechado", () => {
    renderizar({ open: false });
    expect(fetchLlmKeyStatus).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
