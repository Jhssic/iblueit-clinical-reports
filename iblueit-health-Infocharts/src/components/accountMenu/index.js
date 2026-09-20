import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { makeStyles } from "@mui/styles";
import Menu from '@mui/material/Menu';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Logout from '@mui/icons-material/Logout';
import KeyIcon from '@mui/icons-material/Key';

import { useMyContext } from "../../providers/MyContext";
import {
  removerAuthenticationData, isAuthenticated,
  getTokenParameters
} from '../../providers/sessionStorage';
import { pathRoutes } from "../../providers/Routes.jsx";


const useStyles = makeStyles((theme) => ({
  menuItem: {
    "&:hover": {
      backgroundColor: "rgba(195,195,195,0.45)",
    },
  }
}));

const AccountMenu = () => {
  const context = useMyContext();
  const classes = useStyles();
  const navigate = useNavigate();
  const [loggedInUserName] = useState(getTokenParameters('fullname'));
  const [permission] = useState(getTokenParameters('role') === "Administrator");
  const [anchorEl, setAnchorEl] = useState(null);
  const openAccountMenu = Boolean(anchorEl);

  const methodOfLogout = () => {
    try {
      removerAuthenticationData();
      if (!isAuthenticated()) {
        setAnchorEl(null)
        navigate(pathRoutes.LOGIN)
        context.resetState();
      }
    } catch (error) { }
  };

  const stringToColor = (string) => {
    let color = '#';
    let hash = 0;
    let i;
    for (i = 0; i < string.length; i += 1) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    for (i = 0; i < 3; i += 1) {
      const value = (hash >> (i * 8)) & 0xff;
      color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
  }

  const stringAvatar = (name) => {
    const brokenName = name.toLocaleUpperCase().split(' ');
    return {
      sx: { bgcolor: stringToColor(name) },
      children: `${brokenName[0][0]}${(brokenName.length > 1) ? brokenName[1][0] : ''}`,
    };
  }

  return (
    <>
      <IconButton
        size="large"
        aria-haspopup="true"
        aria-controls="menu-appbar"
        aria-label="conta do usuário atual"
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        <Avatar {...stringAvatar(loggedInUserName)} />
      </IconButton>
      <Menu
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px #11192A)',
            mt: 5.2,
            ml: { xs: -1.5, md: -2.4, lg: -3.6, xl: -4.4 },
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        keepMounted
        anchorEl={anchorEl}
        open={openAccountMenu}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        onClose={() => setAnchorEl(null)}
      >
        {permission && (
          <MenuItem
            component={Link}
            className={classes.menuItem}
            to={pathRoutes.SHIPPING_CODE}
            onClick={() => setAnchorEl(null)}
          >
            <ListItemIcon sx={{ color: "text.primary" }}>
              <KeyIcon fontSize="small" />
            </ListItemIcon>
            Código de Envio
          </MenuItem>
        )}
        <MenuItem className={classes.menuItem} onClick={methodOfLogout}>
          <ListItemIcon sx={{ color: "text.primary" }}>
            <Logout fontSize="small" />
          </ListItemIcon>
          Sair
        </MenuItem>
      </Menu>
    </>
  );
};

export default AccountMenu;