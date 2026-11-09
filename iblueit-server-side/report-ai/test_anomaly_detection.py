"""
Testes da detecção de anomalia (RF10 — Isolation Forest).

`random_state=42` fixo em anomaly_detection.py torna o resultado
determinístico para um mesmo conjunto de valores — por isso os testes
abaixo podem comparar contra valores exatos sem flakiness.
"""

import anomaly_detection


def test_detect_anomaly_recusa_com_historico_insuficiente():
    result = anomaly_detection.detect_anomaly([60, 61, 59, 62, 58])

    assert result["evaluated"] is False
    assert result["isAnomaly"] is False
    assert result["anomalyScore"] is None
    assert "histórico insuficiente" in result["reason"]
    assert "5 sessões" in result["reason"]


def test_detect_anomaly_nao_sinaliza_sessao_dentro_do_padrao():
    values = [60, 61, 59, 62, 60, 58, 61, 59, 60]
    result = anomaly_detection.detect_anomaly(values)

    assert result["evaluated"] is True
    assert result["reason"] is None
    assert result["isAnomaly"] is False
    assert result["sessionCount"] == len(values)
    assert isinstance(result["anomalyScore"], float)


def test_detect_anomaly_sinaliza_sessao_fora_do_padrao():
    # Última sessão bem distante do histórico estável do paciente.
    values = [60, 61, 59, 62, 60, 58, 61, 59, 10]
    result = anomaly_detection.detect_anomaly(values)

    assert result["evaluated"] is True
    assert result["isAnomaly"] is True
    assert result["anomalyScore"] < 0


def test_detect_anomaly_respeita_limite_minimo_de_sessoes():
    # MIN_SESSIONS exato (6) já deve avaliar, não recusar.
    values = [60, 61, 59, 62, 60, 58]
    result = anomaly_detection.detect_anomaly(values)

    assert result["evaluated"] is True
    assert result["sessionCount"] == 6
