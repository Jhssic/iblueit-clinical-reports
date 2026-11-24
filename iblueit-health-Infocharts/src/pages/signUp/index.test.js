import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import SignUp from "./index";
import { Context } from "../../providers/MyContext";
import { ComTema } from "../../testUtils/temaTeste";
import { buildContext } from "../../testUtils/renderWithProviders";
import { requestRegisterUsers } from "../../services/api/signUp";

jest.mock("../../services/api/signUp", () => ({ requestRegisterUsers: jest.fn() }));

const renderizar = (context = buildContext()) =>
  render(
    <ComTema><Context.Provider value={context}>
      <MemoryRouter initialEntries={["/signUp"]}>
        <Routes>
          <Route path="/signUp" element={<SignUp />} />
          <Route path="/login" element={<div>Tela de login</div>} />
        </Routes>
      </MemoryRouter>
    </Context.Provider></ComTema>
  );

const preencher = (senha, confirmacao) => {
  fireEvent.change(document.getElementById("firstName"), { target: { value: "Ana" } });
  fireEvent.change(document.getElementById("lastName"), { target: { value: "Souza" } });
  fireEvent.change(document.getElementById("userName"), { target: { value: "anasouza" } });
  fireEvent.change(document.getElementById("email"), { target: { value: "ana@x.com" } });
  fireEvent.change(document.getElementById("password"), { target: { value: senha } });
  fireEvent.change(document.getElementById("confirmPassword"), { target: { value: confirmacao } });
  fireEvent.click(screen.getByRole("button", { name: "Criar Conta" }));
};

describe("Página de cadastro", () => {
  beforeEach(() => requestRegisterUsers.mockReset());

  it("renderiza título e link para login", () => {
    renderizar();
    expect(screen.getByText("Crie uma Conta I BLUE IT!")).toBeInTheDocument();
    expect(screen.getByText(/Já possui uma Conta/)).toHaveAttribute("href", "/login");
  });

  it("alterna a visibilidade da senha e da confirmação", () => {
    renderizar();
    fireEvent.click(screen.getByLabelText("botão para ver a senha"));
    expect(document.getElementById("password")).toHaveAttribute("type", "text");
    fireEvent.mouseDown(screen.getByLabelText("botão para ver a senha"));
    expect(document.getElementById("password")).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByLabelText("botão para ver a confirmar senha"));
    expect(document.getElementById("confirmPassword")).toHaveAttribute("type", "text");
    fireEvent.mouseDown(screen.getByLabelText("botão para ver a confirmar senha"));
    expect(document.getElementById("confirmPassword")).toHaveAttribute("type", "password");
  });

  it("notifica erro e não chama a API quando as senhas são diferentes", () => {
    const context = buildContext();
    renderizar(context);
    preencher("abc", "xyz");
    expect(context.addNotification).toHaveBeenCalledWith("error", "Senhas diferentes");
    expect(requestRegisterUsers).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.getElementById("confirmPassword"));
  });

  it("envia os dados do usuário e navega para o login", async () => {
    requestRegisterUsers.mockResolvedValue();
    const context = buildContext();
    renderizar(context);
    preencher("abc", "abc");
    expect(await screen.findByText("Tela de login")).toBeInTheDocument();
    expect(requestRegisterUsers).toHaveBeenCalledWith(context, {
      fullname: "Ana Souza",
      username: "anasouza",
      password: "abc",
      email: "ana@x.com",
      role: "Administrator",
    });
  });

  it("permanece no cadastro quando a API falha", async () => {
    requestRegisterUsers.mockRejectedValue("erro");
    renderizar();
    preencher("abc", "abc");
    await waitFor(() => expect(requestRegisterUsers).toHaveBeenCalled());
    expect(screen.queryByText("Tela de login")).not.toBeInTheDocument();
  });
});
