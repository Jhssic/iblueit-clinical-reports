import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../testUtils/renderWithProviders";

// Estes componentes herdados importam CSS e um ThemeContext que não existem
// no repositório; os módulos são simulados (virtual) para testar o comportamento.
const mockToggleTheme = jest.fn();
let mockIsDark = false;
jest.mock("../../css/compStyle/compGlobalStyle/GlobalHeaderComp.css", () => ({}), { virtual: true });
jest.mock("../../css/compStyle/compGlobalStyle/SidebarComp.css", () => ({}), { virtual: true });
jest.mock(
  "../../assets/JavaScript/ThemeContext.jsx",
  () => ({ useTheme: () => ({ isDarkTheme: mockIsDark, toggleTheme: mockToggleTheme }) }),
  { virtual: true }
);

const GlobalHeader = require("./GlobalHeaderComp").default;
const Sidebar = require("./SidebarComp").default;

describe("<GlobalHeader />", () => {
  it("renderiza o logotipo na barra de navegação", () => {
    renderWithProviders(<GlobalHeader />);
    expect(screen.getByRole("navigation")).toHaveTextContent("Solve4u");
  });
});

describe("<Sidebar />", () => {
  beforeEach(() => { mockToggleTheme.mockClear(); mockIsDark = false; });

  it("renderiza os links e alterna entre aberta e fechada", () => {
    const { container } = renderWithProviders(<Sidebar />);
    const sidebar = container.querySelector(".sidebar");
    expect(sidebar).toHaveClass("light");
    expect(sidebar).not.toHaveClass("closed");
    expect(screen.getByText("Projects").closest("a")).toHaveAttribute("href", "/projects");

    fireEvent.click(container.querySelector(".toggle-icon"));
    expect(sidebar).toHaveClass("closed");
    fireEvent.click(container.querySelector(".toggle-icon"));
    expect(sidebar).not.toHaveClass("closed");
  });

  it("aciona a troca de tema e aplica a classe do tema escuro", () => {
    mockIsDark = true;
    const { container } = renderWithProviders(<Sidebar />);
    expect(container.querySelector(".sidebar")).toHaveClass("dark");
    fireEvent.click(screen.getByText("Theme"));
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });
});
