import React from "react";

import { createStyles, withStyles, makeStyles } from "@mui/styles";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import { Typography } from "@mui/material";


const CssTextField = withStyles({
  root: {
    maxWidth: 160,
    "& .MuiInput-underline:after": {
      borderBottomColor: "#11192A",
    },
    "& .MuiOutlinedInput-root": {
      "& fieldset": {
        borderColor: "#11192A",
      },
      "&:hover fieldset": {
        borderColor: "#70757F",
        borderWidth: 2,
      },
      "&.Mui-focused fieldset": {
        borderColor: "#11192A",
      },
    },
  },
})(TextField);

const useStyles = makeStyles((theme) =>
  createStyles({
    root: {
      display: "flex",
      flexWrap: "wrap",
    },
    multilineColor: {
      color: "#11192A",
    },
  })
);

const InputFilter = (props) => {
  const classes = useStyles();
  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Typography>{props.label}</Typography>
      <CssTextField
        size="small"
        className={classes.margin}
        InputProps={{ 
          className: classes.multilineColor, 
          type: props.type || 'text',
        }}
        id={props.id}
        name={props.name}
        autoComplete={props.autoComplete}
        required={props.required || false}
        value={props.value}
        onChange={props.onChange}
      />
    </Box>
  );
};

export default InputFilter;
