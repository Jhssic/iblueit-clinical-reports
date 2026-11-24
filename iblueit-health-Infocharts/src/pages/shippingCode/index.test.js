import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import ShippingCode from "./index";
import { renderWithProviders, salvarCredenciais } from "../../testUtils/renderWithProviders";
import { requestGenerateShippingCode } from "../../services/api/shippingCode";
import { updateAuthenticationData } from "../../providers/sessionStorage";

jest.mock("../../services/api/shippingCode", () => ({ requestGenerateShippingCode: jest.fn() }));

describe("Página de Código de Envio", () => {
  beforeEach(() => {
    sessionStorage.clear();
    requestGenerateShippingCode.mockReset();
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
  });

  it("exibe o código atual e desabilita a geração de um novo", () => {
    salvarCredenciais({ gameToken: "ABC-123" });
    renderWithProviders(<ShippingCode />);
    expect(screen.getByLabelText("Código de Envio")).toHaveValue("ABC-123");
    expect(screen.getByRole("button", { name: /Gerar novo Código de Envio/ })).toBeDisabled();
  });

  it("copia o código para a área de transferência e notifica", async () => {
    salvarCredenciais({ gameToken: "ABC-123" });
    const { context } = renderWithProviders(<ShippingCode />);
    fireEvent.click(screen.getByTestId("ContentCopyIcon").closest("button"));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("ABC-123");
    await waitFor(() => expect(context.addNotification).toHaveBeenCalledWith("success", "Código copiado"));
  });

  it("gera um novo código quando o usuário ainda não possui", async () => {
    salvarCredenciais({ gameToken: null });
    requestGenerateShippingCode.mockImplementation(async () => updateAuthenticationData("gameToken", "NOVO-999"));
    const { context } = renderWithProviders(<ShippingCode />);
    expect(screen.getByLabelText("Código de Envio")).toHaveValue("Você não gerou um Código de Envio");
    fireEvent.click(screen.getByRole("button", { name: /Gerar novo Código de Envio/ }));
    await waitFor(() => expect(screen.getByLabelText("Código de Envio")).toHaveValue("NOVO-999"));
    expect(requestGenerateShippingCode).toHaveBeenCalledWith(context);
  });

  it("mantém a tela sem código quando a geração falha", async () => {
    salvarCredenciais({ gameToken: null });
    requestGenerateShippingCode.mockRejectedValue("erro");
    renderWithProviders(<ShippingCode />);
    fireEvent.click(screen.getByRole("button", { name: /Gerar novo Código de Envio/ }));
    await waitFor(() => expect(requestGenerateShippingCode).toHaveBeenCalled());
    expect(screen.getByLabelText("Código de Envio")).toHaveValue("Você não gerou um Código de Envio");
  });
});
