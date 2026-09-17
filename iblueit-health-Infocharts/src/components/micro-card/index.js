import React from "react";
import Card from "@mui/material/Card";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CardContent from "@mui/material/CardContent";

const MicroCard = ({title, value}) => {
  return (
    <Paper
      sx={{
        width: 350,
        marginBottom: 2,
        marginRight: 2
      }}
      elevation={5}
    >
      <Card
        sx={{
          width: 350,
          backgroundColor: "white",
          color: "#5A5C69",
          borderLeft: "5px solid #224ABE",
        }}
      >
        <CardContent>
          <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
            {title.toUpperCase()}
          </Typography>
          <Typography variant="h5" component="div">
            {value}
          </Typography>
        </CardContent>
      </Card>
    </Paper>
  );
};

export default MicroCard;
