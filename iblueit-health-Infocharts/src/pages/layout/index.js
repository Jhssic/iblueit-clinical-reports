/* eslint-disable react-hooks/exhaustive-deps */
// import React from "react";
import React, { useState, useEffect } from "react";
import Constants from "../../utils/contants";
import { Outlet } from "react-router-dom";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";

import { useMyContext } from "../../providers/MyContext";
import Header from "../../components/header";
import TemporaryDrawer from "../../components/side-menu/temporary-drawer";
import PermanentDrawer from "../../components/side-menu/permanent-drawer";
import MenuItens from "../../components/side-menu/menu-itens";
import { getTokenParameters } from '../../providers/sessionStorage';
import { fetchAll } from "../../services/api/patient";


function LayoutPage() {
  const context = useMyContext();
  const [permission] = useState(getTokenParameters('role') === "Administrator");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [patientList, setPatientList] = useState([]);
 
  const setPatientAccount = async () => {
    context.setPatientId(getTokenParameters('pacientId'));
    context.setPatientName(getTokenParameters('fullname'));
  }

  const fetchAllPatients = async () => {
    try {
      const result = await fetchAll(context)
      setPatientList([...result]);
      context.setPatientName(result[0].name || '');
      context.setPatientBirthDate(result[0].birthDate || '');
      context.setPatientId(result[0].id || '');
    } catch (error) { }
  }

  useEffect(() => {
    if (!permission) setPatientAccount();
    else fetchAllPatients();
  }, []);

  const SideBar = (
    <>
      <Box
        component="nav"
        sx={{ width: { md: Constants.DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        <TemporaryDrawer
          width={Constants.DRAWER_WIDTH}
          open={mobileOpen}
          onCloseCallback={() => setMobileOpen(!mobileOpen)}
        >
          <MenuItens
            permission={permission}
            patientList={patientList}
          />
        </TemporaryDrawer>
        <PermanentDrawer
          width={Constants.DRAWER_WIDTH}
        >
          <MenuItens
            permission={permission}
            patientList={patientList}
          />
        </PermanentDrawer> 
      </Box>
    </>
  );

  const MainContent = (
    <>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${Constants.DRAWER_WIDTH}px)` }
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <Header
        offset={Constants.DRAWER_WIDTH}
        handleMenuButton={() => setMobileOpen(!mobileOpen)}
      />

      {SideBar}

      {MainContent}
    </Box>
  );
}

export default LayoutPage;
