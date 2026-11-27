from fastapi import FastAPI, Header
from pydantic import BaseModel
from typing import Optional

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
    metricSources: dict = {}
    patientContext: dict = {}
    alerts: list = []


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/generate-report")
def generate_report(
    req: GenerateReportRequest,
    x_llm_api_key: Optional[str] = Header(default=None),
):
    # X-LLM-Api-Key: chave própria do fisioterapeuta, repassada pela Azure
    # Function. Sem ela, vale a GROQ_API_KEY do ambiente (ou o template).
    return narrative.generate(req.model_dump(), api_key=x_llm_api_key)


class DetectAnomalyRequest(BaseModel):
    values: list[float]
    contamination: float = 0.15


@app.post("/detect-anomaly")
def detect_anomaly(req: DetectAnomalyRequest):
    return anomaly_detection.detect_anomaly(req.values, req.contamination)
