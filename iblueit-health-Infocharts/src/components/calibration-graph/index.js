import Box from "@mui/material/Box";
import React, {useEffect, useState} from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CalibrationGraph = ({exercise, data}) => {
    const [labelY, setLabelY] = useState('')

    useEffect(() => {
        if (!exercise) setLabelY('')
        if(exercise === 'ExpiratoryDuration' || exercise === 'InspiratoryDuration') setLabelY('Segundos')
        if(exercise === 'ExpiratoryPeak' || exercise === 'InspiratoryPeak' || exercise === 'maxExpFlow') setLabelY('Litros por minuto')
        if(exercise === 'RespiratoryFrequency') setLabelY('RPM')
        if(exercise === 'result') setLabelY('Pontos')
        if(exercise === 'scoreRatio') setLabelY('Porcentagem (%)')
    })

    return (
    <Box sx={{ height: 500, overflow: "hidden" }}>
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <XAxis dataKey="date" />
          <YAxis label={{ value: `${labelY}`, angle: -90, position: 'insideLeft', fill: 'black', opacity: 0.5 }} tickLine={false}/>
          <Tooltip />
          <Area type="monotone" dataKey="value" stroke="#11192A" fill="#11192A" />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default CalibrationGraph;
