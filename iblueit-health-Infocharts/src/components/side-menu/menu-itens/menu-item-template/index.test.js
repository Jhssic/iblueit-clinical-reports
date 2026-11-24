import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import MenuItemTemplate from "./index";
import { renderWithProviders } from "../../../../testUtils/renderWithProviders";

const submenus = [
  { title: "Resultados", path: "/plataforma/resultados", icon: <span>i1</span> },
  { title: "Comparativo", path: "/plataforma/comparativo", icon: <span>i2</span> },
];

const renderizar = ({ position = 4, openCategoryPosition = 0, route = "/" } = {}) => {
  const setOpenCategoryPosition = jest.fn();
  renderWithProviders(
    <MenuItemTemplate
      position={position}
      openCategoryPosition={openCategoryPosition}
      setOpenCategoryPosition={setOpenCategoryPosition}
      title="I Blue It"
      icon={<span>icone</span>}
      submenus={submenus}
    />,
    { route }
  );
  return setOpenCategoryPosition;
};

describe("<MenuItemTemplate /> (categoria do menu lateral)", () => {
  it("fechada: não mostra submenus e ao clicar abre a própria posição", () => {
    const setOpen = renderizar();
    expect(screen.queryByText("Resultados")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("I Blue It"));
    expect(setOpen).toHaveBeenCalledWith(4);
  });

  it("aberta: lista os submenus como links e ao clicar fecha (posição 0)", () => {
    const setOpen = renderizar({ openCategoryPosition: 4 });
    expect(screen.getByText("Resultados").closest("a")).toHaveAttribute("href", "/plataforma/resultados");
    expect(screen.getByText("Comparativo").closest("a")).toHaveAttribute("href", "/plataforma/comparativo");
    fireEvent.click(screen.getByText("I Blue It"));
    expect(setOpen).toHaveBeenCalledWith(0);
  });

  it("marca como selecionados a categoria e o submenu da rota atual", () => {
    renderizar({ openCategoryPosition: 4, route: "/plataforma/comparativo" });
    expect(screen.getByText("Comparativo").closest("a")).toHaveClass("Mui-selected");
    expect(screen.getByText("Resultados").closest("a")).not.toHaveClass("Mui-selected");
    expect(screen.getByText("I Blue It").closest('[role="button"]')).toHaveClass("Mui-selected");
  });
});
