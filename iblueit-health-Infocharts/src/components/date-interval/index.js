import React from "react";
import Box from "@mui/material/Box";
import DateInput from "../date-input";

const DateInterval = ({
  handleStartDateChangeCallBack,
  handleFinalDateChangeCallBack,
  disabled = false
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        flexFlow: "wrap",
        rowGap: 2,
      }}
    >
      <Box sx={{ marginRight: 2 }}>
        <DateInput
          handleDateChangeCallBack={handleStartDateChangeCallBack}
          title="Data inicial"
          disabled={disabled}
        />
      </Box>
      <DateInput
        handleDateChangeCallBack={handleFinalDateChangeCallBack}
        title="Data final"
        disabled={disabled}
      />
    </Box>
  );
};

export default DateInterval;
