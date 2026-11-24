import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PermanentDrawer from "./permanent-drawer";
import TemporaryDrawer from "./temporary-drawer";

describe("Gavetas do menu lateral", () => {
  it("PermanentDrawer renderiza o conteúdo sempre aberto com a largura informada", () => {
    render(<PermanentDrawer width={280}><span>conteúdo fixo</span></PermanentDrawer>);
    expect(screen.getByText("conteúdo fixo")).toBeInTheDocument();
    expect(document.querySelector(".MuiDrawer-paper")).toHaveStyle({ width: "280px" });
  });

  it("TemporaryDrawer aberto mostra o conteúdo e chama onCloseCallback ao clicar no fundo", () => {
    const onClose = jest.fn();
    render(<TemporaryDrawer width={240} open={true} onCloseCallback={onClose}><span>conteúdo móvel</span></TemporaryDrawer>);
    expect(screen.getByText("conteúdo móvel")).toBeVisible();
    fireEvent.click(document.querySelector(".MuiBackdrop-root"));
    expect(onClose).toHaveBeenCalled();
  });

  it("TemporaryDrawer usa o container da janela informada", () => {
    const janela = jest.fn(() => window);
    render(<TemporaryDrawer width={240} open={true} onCloseCallback={jest.fn()} window={janela}><span>no container</span></TemporaryDrawer>);
    expect(janela).toHaveBeenCalled();
    expect(document.body).toContainElement(screen.getByText("no container"));
  });
});
