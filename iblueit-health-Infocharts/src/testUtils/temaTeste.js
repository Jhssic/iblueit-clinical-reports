// Tema mínimo para testes: os campos da aplicação usam color="borderInput",
// cor customizada definida no tema do app.js. Sem ela o MUI quebra ao renderizar.
import React from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";

export const temaTeste = createTheme({
  palette: { borderInput: { main: "#11192A" } },
});

export const ComTema = ({ children }) => <ThemeProvider theme={temaTeste}>{children}</ThemeProvider>;
