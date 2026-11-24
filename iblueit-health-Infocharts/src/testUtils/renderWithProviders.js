// Utilitário de testes: renderiza um componente dentro do Router e de um
// contexto controlado (mock do MyContext), permitindo inspecionar chamadas
// como setLoading/addNotification/setPatientId.
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Context } from "../providers/MyContext";

export const buildContext = (overrides = {}) => ({
  resetState: jest.fn(),
  loading: false,
  setLoading: jest.fn(),
  notification: undefined,
  addNotification: jest.fn(),
  patientId: "paciente-1",
  setPatientId: jest.fn(),
  patientName: "Maria",
  setPatientName: jest.fn(),
  patientBirthDate: "2000-01-01",
  setPatientBirthDate: jest.fn(),
  ...overrides,
});

export const renderWithProviders = (ui, { context, route = "/", ...options } = {}) => {
  const ctx = context || buildContext();
  const utils = render(
    <Context.Provider value={ctx}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </Context.Provider>,
    options
  );
  return { ...utils, context: ctx };
};

export const salvarCredenciais = (extra = {}) => {
  sessionStorage.setItem(
    "userCredentials",
    JSON.stringify({
      fullname: "Dra. Teste",
      gameToken: "token-123",
      userId: "user-1",
      authExpirationTime: 9999999999,
      authTime: 1,
      ...extra,
    })
  );
};
