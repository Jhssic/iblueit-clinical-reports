"""
Testes dos endpoints FastAPI (main.py) — sem chave de GROQ_API_KEY no
ambiente de teste, /generate-report cai no template determinístico
(narrative.generate), então não depende de rede.
"""

from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_generate_report_usa_template_sem_chave_de_api(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    payload = {
        "device": "Pitaco",
        "period": {"start": "2026-01-01", "end": "2026-01-07"},
        "sessionCount": 3,
        "isFirstReport": True,
        "currentMetrics": {"DJ": 0.7, "EB": 3},
        "metricSources": {"DJ": "plataformoverviews"},
    }
    response = client.post("/generate-report", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["generatedBy"] == "template"
    assert "Pitaco" in body["resumoSessao"]


def test_generate_report_repassa_initial_metrics_e_campos_opcionais(monkeypatch):
    # Pydantic descarta campos não declarados no modelo — sem initialMetrics
    # e missingOptionalFields no GenerateReportRequest, a Evolução nunca
    # comparava com a avaliação inicial.
    recebido = {}

    def _fake_generate(payload, api_key=None):
        recebido.update(payload)
        return {"ok": True}

    monkeypatch.setattr(main.narrative, "generate", _fake_generate)
    payload = {
        "device": "Pitaco",
        "period": {"start": "2026-01-01", "end": "2026-01-07"},
        "sessionCount": 3,
        "isFirstReport": False,
        "currentMetrics": {"DJ": 0.7},
        "initialMetrics": {"DJ": 0.5},
        "missingOptionalFields": ["SpO2min"],
        "alerts": [{"metric": "DJ", "condition": "Abaixo do valor", "triggerValue": 0.3}],
    }
    response = client.post("/generate-report", json=payload)

    assert response.status_code == 200
    assert recebido["initialMetrics"] == {"DJ": 0.5}
    assert recebido["missingOptionalFields"] == ["SpO2min"]
    assert recebido["alerts"][0]["metric"] == "DJ"


def test_generate_report_evolucao_usa_avaliacao_inicial_ponta_a_ponta(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    payload = {
        "device": "Pitaco",
        "period": {"start": "2026-01-01", "end": "2026-01-07"},
        "sessionCount": 3,
        "isFirstReport": False,
        "currentMetrics": {"DJ": 0.6},
        "initialMetrics": {"DJ": 0.3},
    }
    body = client.post("/generate-report", json=payload).json()
    assert "melhora de 100.0%" in body["evolucao"]


def test_detect_anomaly_endpoint_repassa_direcao():
    values = [3, 3, 4, 3, 3, 4, 3, 9]
    assert client.post("/detect-anomaly", json={"values": values, "direction": "higher_is_worse"}).json()["isAnomaly"] is True
    assert client.post("/detect-anomaly", json={"values": values}).json()["isAnomaly"] is False
    assert client.post("/detect-anomaly", json={"values": values, "direction": "x"}).status_code == 422
def test_generate_report_repassa_chave_do_header_para_o_narrative(monkeypatch):
    recebido = {}

    def _fake_generate(payload, api_key=None):
        recebido["api_key"] = api_key
        return {"generatedBy": "llm"}

    monkeypatch.setattr(main.narrative, "generate", _fake_generate)
    payload = {"device": "Pitaco", "period": {}, "sessionCount": 1, "currentMetrics": {}}

    response = client.post("/generate-report", json=payload, headers={"X-LLM-Api-Key": "chave-do-fisio"})

    assert response.status_code == 200
    assert recebido["api_key"] == "chave-do-fisio"


def test_generate_report_sem_header_nao_envia_chave(monkeypatch):
    recebido = {}

    def _fake_generate(payload, api_key=None):
        recebido["api_key"] = api_key
        return {"generatedBy": "template"}

    monkeypatch.setattr(main.narrative, "generate", _fake_generate)
    payload = {"device": "Pitaco", "period": {}, "sessionCount": 1, "currentMetrics": {}}

    client.post("/generate-report", json=payload)

    assert recebido["api_key"] is None


def test_detect_anomaly_endpoint_historico_insuficiente():
    response = client.post("/detect-anomaly", json={"values": [60, 61, 59]})

    assert response.status_code == 200
    body = response.json()
    assert body["evaluated"] is False
    assert body["isAnomaly"] is False


def test_detect_anomaly_endpoint_com_contaminacao_customizada():
    values = [60, 61, 59, 62, 60, 58, 61, 59, 10]
    response = client.post("/detect-anomaly", json={"values": values, "contamination": 0.2})

    assert response.status_code == 200
    body = response.json()
    assert body["evaluated"] is True
    assert body["sessionCount"] == len(values)
