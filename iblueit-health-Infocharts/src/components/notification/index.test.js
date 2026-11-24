import React from "react";
import { screen } from "@testing-library/react";
import Notification, { extractMessage } from "./index";
import { renderWithProviders, buildContext } from "../../testUtils/renderWithProviders";

describe("extractMessage", () => {
  it("retorna mensagem padrão de conexão quando não há mensagem no erro", () => {
    expect(extractMessage(undefined, "x")).toMatch(/Impossível fazer conexão/);
    expect(extractMessage({}, "")).toMatch(/Impossível fazer conexão/);
  });

  it("prioriza a mensagem de exibição quando há mensagem do servidor", () => {
    expect(extractMessage({ data: { message: "servidor" } }, "exibir")).toBe("exibir");
  });

  it("usa a mensagem de sucesso (data.message) quando não há mensagem de exibição", () => {
    expect(extractMessage({ data: { message: "ok do servidor" } }, "")).toBe("ok do servidor");
  });

  it("usa a mensagem de erro da resposta (response.data.message)", () => {
    expect(extractMessage({ response: { data: { message: "falhou" } } }, "")).toBe("falhou");
  });
});

describe("<Notification />", () => {
  it("renderiza um alerta para cada notificação do contexto (mobile e desktop)", () => {
    const context = buildContext({
      notification: { 1: { type: "error", message: "Erro grave" }, 2: { type: "success", message: "Deu certo" }, 3: {} },
    });
    renderWithProviders(<Notification />, { context });
    expect(screen.getAllByText("Erro grave")).toHaveLength(2);
    expect(screen.getAllByText("Deu certo")).toHaveLength(2);
    expect(screen.getAllByRole("alert")).toHaveLength(4);
  });

  it("não renderiza alertas quando não há notificações", () => {
    renderWithProviders(<Notification />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
