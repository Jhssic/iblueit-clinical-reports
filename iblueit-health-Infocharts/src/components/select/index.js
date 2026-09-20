import React, { useState } from "react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
  select: {
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#11192A",
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#11192A",
      color: "red",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "#70757F",
      borderWidth: 2,
    },
    color: "#11192A",
  },
}));

const SelectComponent = ({
  title,
  items,
  initialKey,
  handleChangeCallBack,
}) => {
  const classes = useStyles();
  const [device, setDevice] = useState(initialKey);

  const handleChange = (event) => {
    setDevice(event.target.value);
    handleChangeCallBack(event.target.value);
  };

  return (
    <Box>
      <FormControl fullWidth>
        <Typography>{title}</Typography>
        <Select
          className={classes.select}
          size="small"
          value={device}
          onChange={handleChange}
          displayEmpty
          inputProps={{ "aria-label": "Without label" }}
        >
          {items.map((item) => (
            <MenuItem value={item.key} key={`SelectComponent${item.key}`}>{item.value}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default SelectComponent;
