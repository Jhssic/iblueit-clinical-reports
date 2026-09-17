import React from "react";
import Drawer from "@mui/material/Drawer";

const TemporaryDrawer = ({
  width,
  open,
  onCloseCallback,
  children,
  window,
}) => {
  const container =
    window !== undefined ? () => window().document.body : undefined;

  return (
    <Drawer
      container={container}
      variant="temporary"
      open={open}
      onClose={onCloseCallback}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile.
      }}
      sx={{
        display: { xs: "block", md: "none" },
        "& .MuiDrawer-paper": { boxSizing: "border-box", width },
      }}
    >
      {children}
    </Drawer>
  );
};

export default TemporaryDrawer;
