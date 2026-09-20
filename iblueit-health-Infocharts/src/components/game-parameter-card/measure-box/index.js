import React from "react";
import Box from "@mui/material/Box";
import { Typography } from "@mui/material";

const MeasureBox = ({ isLeft, title, value, Idname=null, widthBox = "50%", flexDirectionInnerBox="row" }) => {
  return (
    <Box
      sx={{
        paddingLeft: 2,
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        border: "none",
        borderRight: isLeft ? "1px solid #E9EAED" : "none",
        borderBottom: "1px solid #E9EAED",
        width: widthBox,
        height: 100,
      }}
    >
      <Box sx={{ width: '100%', display: "flex", flexDirection: flexDirectionInnerBox, justifyContent: 'space-between', alignItems: "center" }}>
        <Typography variant="h6" sx={{ color: "#11192A", opacity: 0.8, fontSize: { xs: 12, md: 14 }, mr: { xs: 1, md: 0 }, fontWeight: 'bold' }}>
          {title}
        </Typography>
        <Typography variant="h6" id={Idname} sx={{ color: "#11192A", opacity: 0.8, fontSize: { xs: 12, md: 14 }, marginRight: 2, fontWeight: 'bold' }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
};

export default MeasureBox;
