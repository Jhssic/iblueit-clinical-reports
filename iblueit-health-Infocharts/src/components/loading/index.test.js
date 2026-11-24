import React from "react";
import Loading from "./index";
import { renderWithProviders, buildContext } from "../../testUtils/renderWithProviders";

describe("<Loading /> (sobreposição de carregamento)", () => {
  it("não renderiza nada quando o contexto não está carregando", () => {
    const { container } = renderWithProviders(<Loading />, { context: buildContext({ loading: false }) });
    expect(container.innerHTML).toBe("");
  });

  it("renderiza a sobreposição com o spinner quando está carregando", () => {
    const { container } = renderWithProviders(<Loading />, { context: buildContext({ loading: true }) });
    const overlay = container.firstChild;
    expect(overlay).toHaveStyle({ position: "fixed", zIndex: "9999" });
    expect(overlay.querySelector("svg")).not.toBeNull();
  });
});
