import React from "react";
import SelectComponent from "../select";
import {Box} from "@mui/material";

const DeviceSelect = ({device, setDevice}) => {
    return (
        <Box sx={{ width: 200, marginRight: 2 }}>
            <SelectComponent
                handleChangeCallBack={setDevice}
                title="Dispositivo"
                items={[
                    { key: "Pitaco", value: "Pitaco" },
                    { key: "Mano", value: "Manovacuômetro" },
                    { key: "Cinta", value: "Cinta" },
                ]}
                initialKey={device}
            />
        </Box>
    )
}

export default DeviceSelect