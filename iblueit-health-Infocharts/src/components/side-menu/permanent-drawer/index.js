import React from "react";
import Drawer from "@mui/material/Drawer";

const PermanentDrawer = ({ width, children }) => {
  return (
    <Drawer
      variant="permanent"
      sx={[
        {
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width },
        },
      ]}
      open
    >
      {children}
    </Drawer>
  );
};

export default PermanentDrawer;
