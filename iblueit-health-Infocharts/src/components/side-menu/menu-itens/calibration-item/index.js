import React from "react";
import HistoryIcon from "@mui/icons-material/History";
import MenuItemTemplate from "../menu-item-template";

const CalibrationItem = () => {
  return (
    <MenuItemTemplate title='Calibração' submenus={[
      {title: 'Histórico', icon: <HistoryIcon sx={{ fontSize: 17 }}/>}
    ]} />
  );
};

export default CalibrationItem;
