import React from "react";
import Typography from '@mui/material/Typography';
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";

const YellowCard = ({title, content, icon}) => {
  return (
      <Card
        sx={{
          borderRadius: 5,
          width: 354,
          height: 238,
          backgroundColor: "#FEF7CD",
          color: "#5A5C69",
          margin: 3
        }}
        elevation={5}
      >
        <CardContent sx={{display: 'flex', height: '100%', width: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
            {icon}
          <Typography sx={{fontWeight: 'bold', color: '#7B4F01'}} variant="h5" component="div">
            {content}
          </Typography>
          <Typography sx={{fontSize: 18, color: '#A58542'}}>
            {title}
          </Typography>
        </CardContent>
      </Card>
  )
}

export default YellowCard
