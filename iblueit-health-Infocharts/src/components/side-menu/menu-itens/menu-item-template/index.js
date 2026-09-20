import React from "react";
import { Link, useLocation } from "react-router-dom";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Collapse from "@mui/material/Collapse";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

const MenuItemTemplate = ({ position, openCategoryPosition, setOpenCategoryPosition, title, icon, submenus }) => {
  const location = useLocation();
 
  const handleClick = () => {
    const newPosition = (openCategoryPosition === position) ? 0 : position;
    setOpenCategoryPosition(newPosition);
  };

  return (
    <>
      <ListItemButton
        sx={[
          {
            margin: "auto",
            borderRadius: 2,
            width: 260,
            height: 50,
            backgroundColor: "#11192A",
          }, {
            "&.Mui-selected":{
              backgroundColor: "#243761",
            },
            "&.Mui-selected:hover":{
              backgroundColor: "rgba(195,195,195,0.45)",
            },
            "&:hover": {
              backgroundColor: "rgba(195,195,195,0.45)",
            },
          },
        ]}
        selected={(submenus.findIndex(elem => elem.path === location.pathname) > -1)}
        onClick={handleClick}
      >
        <ListItemIcon sx={{ color: "white", opacity: 0.7, minWidth: 30 }}>
          {icon}
        </ListItemIcon>
        <ListItemText sx={{ opacity: 0.75 }} primary={title} />
        {(openCategoryPosition === position) ? (
          <ExpandLess sx={{ opacity: 0.7, fontSize: 20 }} />
        ) : (
          <ExpandMore sx={{ opacity: 0.7, fontSize: 20 }} />
        )}
      </ListItemButton>

      <Collapse in={(openCategoryPosition === position)} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {submenus.map((submenu) => {
            return (
              <ListItemButton
                component={Link}
                to={submenu.path}
                key={`submenus${submenu.path}`}
                selected={(submenu.path === location.pathname)}
                sx={[
                  {
                    margin: "auto",
                    borderRadius: 2,
                    width: 200,
                    height: 45,
                    backgroundColor: "#11192A",
                  }, {
                    "&.Mui-selected":{
                      backgroundColor: "#243761",
                    },
                    "&.Mui-selected:hover":{
                      backgroundColor: "rgba(195,195,195,0.45)",
                    },
                    "&:hover": {
                      backgroundColor: "rgba(195,195,195,0.45)",
                    },
                  },
                ]}
              >
                <ListItemIcon
                  sx={{ color: "white", opacity: 0.7, minWidth: 30 }}
                >
                  {submenu.icon}
                </ListItemIcon>
                <ListItemText sx={{ opacity: 0.75, }} primary={submenu.title} />
              </ListItemButton>
            );
          })}
        </List>
      </Collapse>
    </>
  );
};

export default MenuItemTemplate;
