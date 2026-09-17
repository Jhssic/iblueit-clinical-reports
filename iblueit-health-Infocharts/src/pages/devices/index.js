/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import DeviceCard from "../../components/device-card";
import { fetchDevices } from "../../services/api/calibration";
import { useMyContext } from "../../providers/MyContext";

const DevicesPage = () => {
  const context = useMyContext()
  const [historiesCalibrations, setHistoriesCalibrations] = useState([]);

  useEffect(() => {
    if (context.patientId) getHistoryCalibration();
  }, [context.patientId]);

  const getHistoryCalibration = async () => {
    context.setLoading(true);
    const result = await fetchDevices(context.patientId);
    setHistoriesCalibrations(result);
    context.setLoading(false);
  };

  if(!context.patientId) {
      return (<Typography variant="h2" sx={{fontSize: 20}}>Um paciente precisa ser selecionado!</Typography>);
  }

  return (
    <Box
      sx={{
        marginTop: 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h2" sx={{ fontSize: 20, fontWeight: "bold", letterSpacing: "1px", marginBottom: 1 }}>
        Instrumentos calibrados
      </Typography>
      <Box
        sx={{
          marginTop: 2,
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          flexFlow: "wrap",
        }}
      >
        {historiesCalibrations.map((historyCalibration, index) => (
          <DeviceCard historyCalibration={historyCalibration} key={`historyCalibration${index}`} />
        ))}
      </Box>
    </Box>
  );
};

export default DevicesPage;
