/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState } from "react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { makeStyles } from "@mui/styles";
import { useMyContext } from "../../../../providers/MyContext";
// import { ContactlessOutlined } from "@mui/icons-material";

const useStyles = makeStyles((theme) => ({
  select: {
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#11192A",
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#11192A",
      color: "white",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "#11192A",
      borderWidth: 2,
    },
    "& .MuiSelect-icon": {
      color: "white",
    },

    color: "white",
    marginLeft: 20
  },
}));

const SelectPatient = ({ patientList = []}) => {
  const context = useMyContext();
  const classes = useStyles();

  const handlePatientChange = (event) => {
    const patientId = event.target.value;
    const patient = patientList.find(elem => elem.id === patientId);
    context.setPatientName(patient.name);
    context.setPatientBirthDate(patient.birthDate);
    context.setPatientId(patientId);
  }

  return (
    <Box sx={{ display: "flex", justifyContent: "center", margin: "auto" }}>
      <FormControl sx={{ maxWidth: 250, minWidth: 150 }}>
        <Select
          className={classes.select}
          size="small"
          value={context.patientId || ''}
          onChange={handlePatientChange}
          displayEmpty
          inputProps={{ "aria-label": "Without label" }}
        >
          {patientList.length && patientList.map((patient) => (
            <MenuItem
              key={`SelectPatient${patient.id}`}
              value={patient.id}
            >
              <Typography
                variant="subtitle1"
                sx={{ textAlign: "center", fontWeight: "bold", fontSize: 15 }}
              >
                {patient.name}
              </Typography>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default SelectPatient;
