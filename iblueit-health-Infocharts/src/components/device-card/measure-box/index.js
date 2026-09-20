import React from "react";
import Box from "@mui/material/Box";
import {Typography} from "@mui/material";

const MeasureBox = ({isLeft, title, value, icon}) => {
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
        width: '50%',
        height: 75,
      }}
    >
      <Box sx={{
        width: '100%',
        display: "flex",
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box
          component="img"
          sx={{width: { xs: 40, md: 50 }}}
          src={icon}
        />
        <Box sx={{display: 'flex', width: '100%', justifyContent: 'space-between', marginLeft: {xs: 1, md: 2}}}>
          <Typography variant="h6"
                      sx={{color: "#11192A", opacity: 0.8, fontSize: {xs: 12, md: 14 }, fontWeight: 'bold'}}>
            {title}
          </Typography>
          <Typography variant="h6"
                      sx={{
                        color: "#11192A",
                        opacity: 0.8,
                        fontSize: { xs: 12, md: 14 },
                        marginRight: 2,
                        fontWeight: 'bold'
                      }}>
            {value}
          </Typography>
        </Box>

      </Box>
    </Box>
  );
};

export default MeasureBox;
