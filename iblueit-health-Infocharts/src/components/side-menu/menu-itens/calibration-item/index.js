import React from "react";
import HistoryIcon from "@mui/icons-material/History";
import MenuItemTemplate from "../menu-item-template";
import { pathRoutes } from "../../../../providers/Routes";

const CalibrationItem = () => {
  return (
    <MenuItemTemplate title='Calibração' submenus={[
      {title: 'Histórico', path: pathRoutes.HISTORICAL_CALIBRATION, icon: <HistoryIcon sx={{ fontSize: 17 }}/>}
    ]} />
  );
};

export default CalibrationItem;
