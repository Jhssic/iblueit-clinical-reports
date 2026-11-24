import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import InputFilter from "./results";

describe("<InputFilter />", () => {
  it("renderiza o rótulo e repassa o valor e o tipo para o campo", () => {
    render(<InputFilter label="Idade Inicial" type="number" id="idade" name="idade" value={10} onChange={() => {}} required />);
    expect(screen.getByText("Idade Inicial")).toBeInTheDocument();
    const campo = screen.getByRole("spinbutton");
    expect(campo).toHaveValue(10);
    expect(campo).toHaveAttribute("id", "idade");
    expect(campo).toBeRequired();
  });

  it("usa tipo texto por padrão e chama onChange ao digitar", () => {
    const onChange = jest.fn();
    render(<InputFilter label="Nome" value="" onChange={onChange} />);
    const campo = screen.getByRole("textbox");
    expect(campo).toHaveAttribute("type", "text");
    expect(campo).not.toBeRequired();
    fireEvent.change(campo, { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
