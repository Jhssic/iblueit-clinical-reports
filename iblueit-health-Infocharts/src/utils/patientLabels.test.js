import { translateSex, translateCondition, translateRole } from "./patientLabels";

describe("patientLabels (tradução dos valores do cadastro)", () => {
  it("traduz sexo", () => {
    expect(translateSex("Male")).toBe("Masculino");
    expect(translateSex("Female")).toBe("Feminino");
  });

  it("traduz todas as condições aceitas pelo backend", () => {
    expect(translateCondition("Healthy")).toBe("Saudável");
    expect(translateCondition("Obstructive")).toBe("Obstrutivo");
    expect(translateCondition("Restrictive")).toBe("Restritivo");
  });

  it("traduz o papel do profissional", () => {
    expect(translateRole("Administrator")).toBe("Administrador");
    expect(translateRole("Therapist")).toBe("Fisioterapeuta");
  });

  it("mantém valor desconhecido e retorna null quando ausente", () => {
    expect(translateCondition("DPOC")).toBe("DPOC");
    expect(translateSex(undefined)).toBeNull();
    expect(translateCondition("")).toBeNull();
    expect(translateRole(null)).toBeNull();
  });
});
