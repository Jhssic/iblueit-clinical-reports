/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState } from "react";
// import SelectComponent from "../../select"
import { Link, useLocation } from "react-router-dom";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Avatar from "@mui/material/Avatar";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import ScaleIcon from "@mui/icons-material/Scale";
import ExtensionIcon from "@mui/icons-material/Extension";
import PersonIcon from "@mui/icons-material/Person";
import DashboardIcon from "@mui/icons-material/Dashboard";
import HistoryIcon from "@mui/icons-material/History";
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import { Typography } from "@mui/material";
import MenuItemTemplate from "./menu-item-template";
import AddIcon from '@mui/icons-material/Add';
import AssessmentIcon from '@mui/icons-material/Assessment';

import { pathRoutes } from "../../../providers/Routes";
import SelectPatient from "./select-patient";


const divider = (
  <Divider
    sx={{
      backgroundColor: "white",
      opacity: 0.25,
      maxWidth: 260,
      margin: "auto",
      marginTop: 4,
      marginBottom: 4,
    }}
  />
);

const MenuItens = ({ permission, patientList }) => {
  const [openCategoryPosition, setOpenCategoryPosition] = useState(0);
  const location = useLocation();

  return (
    <>
      <List sx={{ marginTop: 2 }}>

        {permission && (
          <Box>
            <Avatar
              sx={{ width: 65, height: 65, margin: "auto", marginBottom: 1 }}
            />
            <SelectPatient
              patientList={patientList}
            />
            <Typography
              variant="body2"
              sx={{ textAlign: "center", color: "white", opacity: 0.7 }}
            >
              Paciente
            </Typography>
          </Box>
        )}

        {divider}
        <Typography
          variant="subtitle1"
          sx={{
            marginLeft: 3.5,
            marginBottom: 0.5,
            fontSize: 14,
            opacity: 0.45,
            fontWeight: "bold",
          }}
        >
          Dashboard
        </Typography>
        <MenuItemTemplate
          position={1}
          openCategoryPosition={openCategoryPosition}
          setOpenCategoryPosition={setOpenCategoryPosition}
          title="Painel geral"
          icon={<DashboardIcon sx={{ fontSize: 17 }} />}
          submenus={[
            { title: "Informações", path: pathRoutes.INFORMATION_PANEL, icon: <DeviceHubIcon sx={{ fontSize: 17 }} /> },
          ]}
        />

        {divider}
        <Typography
          variant="subtitle1"
          sx={{
            marginLeft: 3.5,
            marginBottom: 0.5,
            fontSize: 14,
            opacity: 0.45,
            fontWeight: "bold",
          }}
        >
          Gráficos
        </Typography>
        <MenuItemTemplate
          position={2}
          openCategoryPosition={openCategoryPosition}
          setOpenCategoryPosition={setOpenCategoryPosition}
          title="Calibração"
          icon={<ScaleIcon sx={{ fontSize: 17 }} />}
          submenus={[
            { title: "Instrumentos", path: pathRoutes.CALIBRATION_INSTRUMENTS, icon: <DeviceHubIcon sx={{ fontSize: 17 }} /> },
            { title: "Histórico", path: pathRoutes.HISTORICAL_CALIBRATION, icon: <HistoryIcon sx={{ fontSize: 17 }} /> }
          ]}
        />
        <MenuItemTemplate
          position={3}
          openCategoryPosition={openCategoryPosition}
          setOpenCategoryPosition={setOpenCategoryPosition}
          title="Minigames"
          icon={<SportsEsportsIcon sx={{ fontSize: 17 }} />}
          submenus={[
            { title: "Resultados", path: pathRoutes.MINI_GAMES_RESULTS, icon: <DeviceHubIcon sx={{ fontSize: 17 }} /> },
            { title: "Comparativo", path: pathRoutes.MINI_GAMES_COMPARATIVE, icon: <HistoryIcon sx={{ fontSize: 17 }} /> }
          ]}
        />
        <MenuItemTemplate
          position={4}
          openCategoryPosition={openCategoryPosition}
          setOpenCategoryPosition={setOpenCategoryPosition}
          title="I Blue It"
          icon={<ExtensionIcon sx={{ fontSize: 17 }} />}
          submenus={[
            { title: "Resultados", path: pathRoutes.PLATFORM_RESULTS, icon: <DeviceHubIcon sx={{ fontSize: 17 }} /> },
            { title: "Comparativo", path: pathRoutes.PLATFORM_COMPARATIVE, icon: <HistoryIcon sx={{ fontSize: 17 }} /> }
          ]}
        />

        {divider}
        <Typography
          variant="subtitle1"
          sx={{
            marginLeft: 3.5,
            marginBottom: 0.5,
            fontSize: 14,
            opacity: 0.45,
            fontWeight: "bold",
          }}
        >
          Relatórios
        </Typography>
        <ListItemButton
          component={Link}
          to={pathRoutes.CLINICAL_REPORT}
          selected={location.pathname === pathRoutes.CLINICAL_REPORT}
          sx={[
            {
              margin: "auto",
              borderRadius: 2,
              width: 260,
              height: 50,
              backgroundColor: "#11192A",
            }, {
              "&.Mui-selected": { backgroundColor: "#243761" },
              "&.Mui-selected:hover": { backgroundColor: "rgba(195,195,195,0.45)" },
              "&:hover": { backgroundColor: "rgba(195,195,195,0.45)" },
            },
          ]}
        >
          <ListItemIcon sx={{ color: "white", opacity: 0.7, minWidth: 30 }}>
            <AssessmentIcon sx={{ fontSize: 17 }} />
          </ListItemIcon>
          <ListItemText sx={{ opacity: 0.75 }} primary="Relatório Clínico" />
        </ListItemButton>

        {divider}

        {permission && (
          <>
            <Typography
              variant="subtitle1"
              sx={{
                marginTop: 2,
                marginLeft: 3.5,
                marginBottom: 0.5,
                fontSize: 14,
                opacity: 0.45,
                fontWeight: "bold",
              }}
            >
              Sistema
            </Typography>
            <MenuItemTemplate
              position={6}
              openCategoryPosition={openCategoryPosition}
              setOpenCategoryPosition={setOpenCategoryPosition}
              title="Sessão"
              icon={<SportsEsportsIcon sx={{ fontSize: 17 }} />}
              submenus={[
                { title: "Definir", path: pathRoutes.GAME_CONFIGURATION_DEFINE, icon: <AddIcon sx={{ fontSize: 17 }} /> },
                { title: "Recomendar", path: pathRoutes.GAME_CONFIGURATION_CREATE, icon: <AddIcon sx={{ fontSize: 17 }} /> },
              ]}
            />
            <MenuItemTemplate
              position={7}
              openCategoryPosition={openCategoryPosition}
              setOpenCategoryPosition={setOpenCategoryPosition}
              title="Conta do Paciente"
              icon={<PersonIcon sx={{ fontSize: 17 }} />}
              submenus={[
                { title: "Definir", path: pathRoutes.PATIENT_ACCOUNT, icon: <AddIcon sx={{ fontSize: 17 }} /> },
              ]}
            />
          </>
        )}
      </List>
    </>
  );
};

export default MenuItens;
