// Seleciona uma opção em um SelectComponent (MUI Select) do app. Os Selects
// não têm label acessível (aria-label "Without label"), então localizamos o
// botão pelo valor exibido atualmente.
import { screen, fireEvent, within } from "@testing-library/react";

export const selecionarOpcao = (valorAtual, opcao) => {
  const select = screen
    .getAllByRole("button", { name: "Without label" })
    .find((el) => el.textContent === valorAtual);
  if (!select) throw new Error(`Select com valor "${valorAtual}" não encontrado`);
  fireEvent.mouseDown(select);
  fireEvent.click(within(screen.getByRole("listbox")).getByText(opcao));
};
