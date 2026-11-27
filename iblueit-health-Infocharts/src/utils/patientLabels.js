// Tradução dos valores do cadastro do paciente (gravados em inglês no backend —
// ver shared/Validators.js: sex Male/Female, condition Healthy/Obstructive/
// Restrictive) para os rótulos exibidos na interface e no PDF. Fonte única
// usada pelo painel de informações e pelo relatório clínico.

const SEX_LABELS = {
  Male: "Masculino",
  Female: "Feminino",
};

const CONDITION_LABELS = {
  Healthy: "Saudável",
  Obstructive: "Obstrutivo",
  Restrictive: "Restritivo",
};

// Papéis de usuário (role do token) exibidos como profissional responsável.
const ROLE_LABELS = {
  Administrator: "Administrador",
  Therapist: "Fisioterapeuta",
  User: "Paciente",
};

// Valor desconhecido é exibido como veio (melhor do que sumir da tela);
// valor ausente retorna null para quem chama decidir o placeholder.
const translate = (labels) => (value) => {
  if (value == null || value === "") return null;
  return labels[value] || value;
};

export const translateSex = translate(SEX_LABELS);
export const translateCondition = translate(CONDITION_LABELS);
export const translateRole = translate(ROLE_LABELS);
