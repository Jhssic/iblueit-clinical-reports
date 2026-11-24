import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./index";
import { Context } from "../../providers/MyContext";
import { ComTema } from "../../testUtils/temaTeste";
import { buildContext, salvarCredenciais } from "../../testUtils/renderWithProviders";
import { postAuthentication } from "../../services/authentication";

jest.mock("../../services/authentication", () => ({ postAuthentication: jest.fn() }));

const renderizar = (context = buildContext()) =>
  render(
    <ComTema><Context.Provider value={context}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard/informationPanel" element={<div>Painel carregado</div>} />
        </Routes>
      </MemoryRouter>
    </Context.Provider></ComTema>
  );

const preencherEEnviar = () => {
  fireEvent.change(screen.getByLabelText(/Usuário/), { target: { value: "medica" } });
  fireEvent.change(document.getElementById("password"), { target: { value: "segredo" } });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
};

describe("Página de login", () => {
  beforeEach(() => {
    sessionStorage.clear();
    postAuthentication.mockReset();
  });

  it("renderiza o formulário com link para cadastro", () => {
    renderizar();
    expect(screen.getByText("I BLUE IT: Health InfoCharts")).toBeInTheDocument();
    expect(screen.getByText("Criar Conta I BLUE IT!")).toHaveAttribute("href", "/signUp");
  });

  it("alterna a visibilidade da senha", () => {
    renderizar();
    const senha = document.getElementById("password");
    expect(senha).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByLabelText("botão para ver a senha"));
    expect(senha).toHaveAttribute("type", "text");
    fireEvent.mouseDown(screen.getByLabelText("botão para ver a senha"));
    expect(senha).toHaveAttribute("type", "password");
  });

  it("autentica com usuário e senha e navega para o painel", async () => {
    postAuthentication.mockImplementation(async () => salvarCredenciais());
    const context = buildContext();
    renderizar(context);
    preencherEEnviar();
    expect(await screen.findByText("Painel carregado")).toBeInTheDocument();
    expect(postAuthentication).toHaveBeenCalledWith(context, "medica", "segredo");
  });

  it("permanece no login quando a autenticação falha", async () => {
    postAuthentication.mockRejectedValue(new Error("Usuário ou senha incorretos"));
    renderizar();
    preencherEEnviar();
    await waitFor(() => expect(postAuthentication).toHaveBeenCalled());
    expect(screen.queryByText("Painel carregado")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });

  it("não navega se a resposta não gerou credenciais válidas", async () => {
    postAuthentication.mockResolvedValue();
    renderizar();
    preencherEEnviar();
    await waitFor(() => expect(postAuthentication).toHaveBeenCalled());
    expect(screen.queryByText("Painel carregado")).not.toBeInTheDocument();
  });
});
