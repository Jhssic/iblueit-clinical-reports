/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import { useMyContext } from "../../providers/MyContext";
import { pathRoutes } from "../../providers/Routes";
import { fetchAll } from "../../services/api/patient";

const PatientList = () => {
  const context = useMyContext();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);

  const loadPatients = async () => {
    try {
      const result = await fetchAll(context);
      setPatients(result);
    } catch (error) { }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleSelectPatient = (patient) => {
    context.setPatientId(patient.id);
    context.setPatientName(patient.name);
    context.setPatientBirthDate(patient.birthDate);
    navigate(pathRoutes.CLINICAL_REPORT);
  };

  return (
    <Box sx={{ marginTop: 1 }}>
      <Typography variant="h6" sx={{ fontWeight: "bold", color: "#11192A", mb: 2 }}>
        Lista de Pacientes
      </Typography>

      {!patients.length ? (
        <Typography sx={{ color: "#9e9e9e", fontSize: 13 }}>Nenhum paciente cadastrado.</Typography>
      ) : (
        <TableContainer component={Paper} sx={{ backgroundColor: "white", boxShadow: 2, borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f7ff" }}>
                <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Condição</TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Idade</TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {patients.map((p) => (
                <TableRow
                  key={p.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => handleSelectPatient(p)}
                >
                  <TableCell sx={{ fontSize: 13, color: "#11192A" }}>{p.name}</TableCell>
                  <TableCell sx={{ fontSize: 13, color: "#11192A" }}>{p.condition || "-"}</TableCell>
                  <TableCell sx={{ fontSize: 13, color: "#11192A" }}>
                    {p.birthDate ? `${moment().diff(p.birthDate, "years")} anos` : "-"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={p.alertStatus === "Ativo" ? "Ativo" : "Normal"}
                      sx={{
                        backgroundColor: p.alertStatus === "Ativo" ? "#ffccbc" : "#e8f5e9",
                        color: p.alertStatus === "Ativo" ? "#bf360c" : "#2e7d32",
                        fontWeight: "bold",
                        fontSize: 11,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default PatientList;
