/* eslint-disable no-unused-vars */
import * as React from "react";
import {
  createStyles,
  withStyles,
  makeStyles,
} from "@mui/styles";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import "react-datepicker/dist/react-datepicker.css";
import { Typography } from "@mui/material";

// source: https://codesandbox.io/s/6rx8p?file=/demo.tsx:3138-3168
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

const DateInput = ({ title, handleDateChangeCallBack, disabled = false }) => {
  const classes = useStyles();
  const [date, setDate] = React.useState(new Date());
  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Typography>{title}</Typography>
      <CssTextField
        size="small"
        InputProps={{
          //shrink: false,
          className: classes.multilineColor,
        }}
        //InputLabelProps={{ shrink: false, display: "none" }}
        className={classes.margin}
        id="custom-css-standard-input"
        //label=""
        type="date"
        disabled={disabled}
        onChange={(event) => {
          setDate(event.target.value);
          handleDateChangeCallBack(event.target.value);
        }}
      />
    </Box>
  );
};

export default DateInput;
