import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import AccountMenu from "./index";
import { renderWithProviders, salvarCredenciais } from "../../testUtils/renderWithProviders";
import { fetchLlmKeyStatus } from "../../services/api/llmApiKey";

jest.mock("../../services/api/llmApiKey");

const renderizar = () =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<AccountMenu />} />
      <Route path="/login" element={<div>Tela de login</div>} />
      <Route path="/shippingCode" element={<div>Tela de código de envio</div>} />
    </Routes>
  );

describe("<AccountMenu /> (menu da conta do usuário)", () => {
  beforeEach(() => sessionStorage.clear());

  it("mostra as iniciais do nome do usuário no avatar", () => {
    salvarCredenciais({ fullname: "Maria Silva" });
    renderizar();
    expect(screen.getByText("MS")).toBeInTheDocument();
  });

  it("usa apenas a primeira inicial quando o nome tem uma palavra", () => {
    salvarCredenciais({ fullname: "joana" });
    renderizar();
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("usuário comum vê apenas a opção Sair", () => {
    salvarCredenciais({ fullname: "Maria Silva", role: "Pacient" });
    renderizar();
    fireEvent.click(screen.getByLabelText("conta do usuário atual"));
    expect(screen.getByText("Sair")).toBeVisible();
    expect(screen.queryByText("Código de Envio")).not.toBeInTheDocument();
    expect(screen.queryByText("Chave de IA")).not.toBeInTheDocument();
  });

  it("fisioterapeuta vê a opção Chave de IA e abre o diálogo de configuração", async () => {
    fetchLlmKeyStatus.mockResolvedValue({ configured: false, last4: null, updatedAt: null });
    salvarCredenciais({ fullname: "Dra. Ana", role: "Therapist" });
    renderizar();
    fireEvent.click(screen.getByLabelText("conta do usuário atual"));
    expect(screen.queryByText("Código de Envio")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Chave de IA"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByText(/Nenhuma chave própria configurada/)).toBeInTheDocument();
  });

  it("administrador vê o link de Código de Envio e navega até ele", async () => {
    salvarCredenciais({ fullname: "Admin Geral", role: "Administrator" });
    renderizar();
    fireEvent.click(screen.getByLabelText("conta do usuário atual"));
    fireEvent.click(screen.getByText("Código de Envio"));
    expect(await screen.findByText("Tela de código de envio")).toBeInTheDocument();
  });

  it("ao sair limpa a sessão, reseta o contexto e vai para o login", async () => {
    salvarCredenciais({ fullname: "Maria Silva" });
    const { context } = renderizar();
    fireEvent.click(screen.getByLabelText("conta do usuário atual"));
    fireEvent.click(screen.getByText("Sair"));
    expect(sessionStorage.getItem("userCredentials")).toBeNull();
    expect(context.resetState).toHaveBeenCalled();
    expect(await screen.findByText("Tela de login")).toBeInTheDocument();
  });

  it("fecha o menu ao pressionar Esc", async () => {
    salvarCredenciais({ fullname: "Maria Silva" });
    renderizar();
    fireEvent.click(screen.getByLabelText("conta do usuário atual"));
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    await waitFor(() => expect(screen.getByText("Sair")).not.toBeVisible());
  });
});
