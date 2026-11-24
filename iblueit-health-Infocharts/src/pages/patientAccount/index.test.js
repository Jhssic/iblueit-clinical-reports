import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import PatientAccount from "./index";
import { renderWithProviders, buildContext, salvarCredenciais } from "../../testUtils/renderWithProviders";
import { ComTema } from "../../testUtils/temaTeste";
import { getPatientAccount } from "../../services/api/patientAccount";
import { requestRegisterUsers } from "../../services/api/signUp";

jest.mock("../../services/api/patientAccount", () => ({ getPatientAccount: jest.fn() }));
jest.mock("../../services/api/signUp", () => ({ requestRegisterUsers: jest.fn() }));

const renderizar = (context = buildContext()) =>
  renderWithProviders(
    <ComTema>
      <PatientAccount />
    </ComTema>,
    { context }
  );

const preencher = (senha, confirmacao) => {
  fireEvent.change(document.getElementById("user"), { target: { value: "joao" } });
  fireEvent.change(document.getElementById("email"), { target: { value: "joao@x.com" } });
  fireEvent.change(document.getElementById("password"), { target: { value: senha } });
  fireEvent.change(document.getElementById("confirmPassword"), { target: { value: confirmacao } });
  fireEvent.click(screen.getByRole("button", { name: "Criar Conta" }));
};

describe("Página Conta do Paciente", () => {
  beforeEach(() => {
    sessionStorage.clear();
    salvarCredenciais({ gameToken: "tok" });
    getPatientAccount.mockReset();
    requestRegisterUsers.mockReset();
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
  });

  it("mostra os dados de acesso quando o paciente já possui conta e permite copiar", async () => {
    getPatientAccount.mockResolvedValue({ username: "maria.p", password: "123" });
    const { context } = renderizar();
    expect(await screen.findByText(/dão acesso a conta do\(a\) usuário\(a\) Maria/)).toBeInTheDocument();
    expect(screen.getByLabelText("Usuário")).toHaveValue("maria.p");
    expect(screen.getByLabelText("Senha")).toHaveValue("123");
    fireEvent.click(screen.getByRole("button", { name: /copiar Usuário e Senha/ }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Usuário: maria.p Senha: 123");
    await waitFor(() => expect(context.addNotification).toHaveBeenCalledWith("success", "Usuário e Senha copiados"));
  });

  it("mostra o formulário de criação quando não há conta e alterna visibilidade das senhas", async () => {
    getPatientAccount.mockResolvedValue(null);
    renderizar();
    expect(await screen.findByText(/Preencha os campos abaixo/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("botão para ver a senha"));
    expect(document.getElementById("password")).toHaveAttribute("type", "text");
    fireEvent.mouseDown(screen.getByLabelText("botão para ver a senha"));
    fireEvent.click(screen.getByLabelText("botão para ver a confirmar senha"));
    expect(document.getElementById("confirmPassword")).toHaveAttribute("type", "text");
    fireEvent.mouseDown(screen.getByLabelText("botão para ver a confirmar senha"));
    expect(document.getElementById("confirmPassword")).toHaveAttribute("type", "password");
  });

  it("não busca conta quando não há paciente selecionado e bloqueia o envio", () => {
    const context = buildContext({ patientId: undefined });
    renderizar(context);
    expect(getPatientAccount).not.toHaveBeenCalled();
    preencher("a", "a");
    expect(context.addNotification).toHaveBeenCalledWith("error", "Nenhum paciente selecionados");
    expect(requestRegisterUsers).not.toHaveBeenCalled();
  });

  it("notifica senhas diferentes", async () => {
    getPatientAccount.mockResolvedValue(null);
    const context = buildContext();
    renderizar(context);
    await waitFor(() => expect(getPatientAccount).toHaveBeenCalled());
    preencher("a", "b");
    expect(context.addNotification).toHaveBeenCalledWith("error", "Senhas diferentes");
  });

  it("cria a conta do paciente e recarrega os dados", async () => {
    getPatientAccount.mockResolvedValueOnce(null).mockResolvedValueOnce({ username: "joao", password: "s" });
    requestRegisterUsers.mockResolvedValue();
    const context = buildContext();
    renderizar(context);
    await screen.findByText(/Preencha os campos abaixo/);
    preencher("s", "s");
    await waitFor(() =>
      expect(requestRegisterUsers).toHaveBeenCalledWith(context, {
        email: "joao@x.com",
        password: "s",
        role: "User",
        username: "joao",
        fullname: "Maria",
        pacientId: "paciente-1",
        gameToken: "tok",
      })
    );
    expect(await screen.findByRole("button", { name: /copiar Usuário e Senha/ })).toBeInTheDocument();
    expect(getPatientAccount).toHaveBeenCalledTimes(2);
  });

  it("não recarrega quando o cadastro falha", async () => {
    getPatientAccount.mockResolvedValue(null);
    requestRegisterUsers.mockRejectedValue("erro");
    renderizar();
    await screen.findByText(/Preencha os campos abaixo/);
    preencher("s", "s");
    await waitFor(() => expect(requestRegisterUsers).toHaveBeenCalled());
    expect(getPatientAccount).toHaveBeenCalledTimes(1);
  });
});
