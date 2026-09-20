import React from "react";
import { Link } from "react-router-dom";
import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import Box from '@mui/material/Box';
import logo from '../../images/favicon.png'

import AccountMenu from '../accountMenu';
import { pathRoutes } from "../../providers/Routes.jsx";


const Header = ({ offset, handleMenuButton }) => {
  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: 'white',
        width: { md: `calc(100% - ${offset}px)` },
        ml: { md: `${offset}px` },
      }}
    >
      <Toolbar>
        <IconButton
          aria-label="open drawer"
          edge="start"
          onClick={handleMenuButton}
          sx={{ mr: 2, display: { md: "none" }, color: '#11192A' }}
        >
          <MenuIcon />
        </IconButton>
        <Typography
          noWrap
          variant="h6"
          component={Link}
          to={pathRoutes.INFORMATION_PANEL}
          sx={{ color: '#11192A', textDecoration: 'none' }}
        >
          I Blue It
          <img
            alt='Logo'
            src={logo}
            style={{ height: 20, marginLeft: 10 }}
          />
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <AccountMenu />
      </Toolbar>
    </AppBar>
  );
};

export default Header;
