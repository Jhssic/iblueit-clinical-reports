from fastapi import FastAPI
from pydantic import BaseModel
from typing import Literal, Optional

import narrative
import anomaly_detection

app = FastAPI(title="I Blue It — Report AI (URL_API_IA)")

# Serviço interno: só a Azure Function (server-to-server) chama este endpoint,
# então não há necessidade de liberar CORS pra origens de navegador.


class Period(BaseModel):
    start: Optional[str] = None
    end: Optional[str] = None


class GenerateReportRequest(BaseModel):
    device: str
    period: Period
    sessionCount: int
    isFirstReport: bool = False
    currentMetrics: dict
    previousMetrics: Optional[dict] = None
    # Pydantic descarta campos não declarados: sem estes dois, a avaliação
    # inicial nunca chegava em narrative.generate e a "Evolução" nunca era
    # calculada; o mesmo com os campos opcionais ausentes (FA02).
    initialMetrics: Optional[dict] = None
    missingOptionalFields: list = []
    metricSources: dict = {}
    patientContext: dict = {}
    alerts: list = []


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/generate-report")
def generate_report(req: GenerateReportRequest):
    return narrative.generate(req.model_dump())


class DetectAnomalyRequest(BaseModel):
    values: list[float]
    contamination: float = 0.15
    # Sentido clínico de "piora" da métrica — ver anomaly_detection.detect_anomaly.
    direction: Literal["lower_is_worse", "higher_is_worse"] = "lower_is_worse"


@app.post("/detect-anomaly")
def detect_anomaly(req: DetectAnomalyRequest):
    return anomaly_detection.detect_anomaly(req.values, req.contamination, req.direction)
