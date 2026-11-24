import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./app";
import { MyContext } from "./providers/MyContext";
import { setTimezone } from "./providers/preferences";

jest.mock("./providers/preferences", () => ({ setTimezone: jest.fn() }));
// As rotas têm teste próprio; aqui só verificamos a montagem do App.
jest.mock("./components/AssemblyOfRoutes", () => {
  const { useLocation } = require("react-router-dom");
  const { useMyContext } = require("./providers/MyContext");
  return () => {
    const ctx = useMyContext();
    const location = useLocation();
    return (
      <div>
        <span data-testid="rota-atual">{location.pathname}</span>
        <button onClick={() => ctx.setLoading(true)}>iniciar carregamento</button>
        <button onClick={() => ctx.addNotification("warning", "Atenção!")}>notificar</button>
      </div>
    );
  };
});

describe("<App />", () => {
  it("configura o fuso horário e monta o roteador na rota inicial", () => {
    render(<MyContext><App /></MyContext>);
    expect(setTimezone).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("rota-atual")).toHaveTextContent("/");
  });

  it("exibe o carregamento e as notificações globais a partir do contexto", () => {
    const { container } = render(<MyContext><App /></MyContext>);
    expect(container.querySelector('div[style*="z-index: 9999"]')).toBeNull();

    fireEvent.click(screen.getByText("iniciar carregamento"));
    expect(container.querySelector('div[style*="z-index: 9999"]')).not.toBeNull();

    fireEvent.click(screen.getByText("notificar"));
    expect(screen.getAllByText("Atenção!").length).toBeGreaterThan(0);
  });
});
