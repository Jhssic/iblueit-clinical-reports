from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

import narrative

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
    metricSources: dict = {}
    patientContext: dict = {}
    alerts: list = []


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/generate-report")
def generate_report(req: GenerateReportRequest):
    return narrative.generate(req.model_dump())
