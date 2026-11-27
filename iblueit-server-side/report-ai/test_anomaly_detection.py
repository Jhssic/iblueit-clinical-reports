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


def test_detect_anomaly_salto_de_melhora_nao_sinaliza():
    # DJ/PJ: subir muito é melhora — não pode virar alerta de deterioração.
    values = [60, 61, 59, 62, 60, 58, 61, 59, 110]
    result = anomaly_detection.detect_anomaly(values)

    assert result["evaluated"] is True
    assert result["isAnomaly"] is False


def test_detect_anomaly_eb_subida_sinaliza_e_queda_nao():
    # EB (Escala de Borg): maior é pior — o sentido é invertido.
    piora = anomaly_detection.detect_anomaly([3, 3, 4, 3, 3, 4, 3, 9], 0.15, "higher_is_worse")
    melhora = anomaly_detection.detect_anomaly([3, 3, 4, 3, 3, 4, 3, 0], 0.15, "higher_is_worse")

    assert piora["isAnomaly"] is True
    assert melhora["isAnomaly"] is False


def test_detect_anomaly_queda_pequena_dentro_do_ruido_nao_sinaliza():
    # 58 é só 1 abaixo do mínimo do histórico — ruído, não deterioração.
    result = anomaly_detection.detect_anomaly([60, 61, 59, 62, 60, 58])
    assert result["isAnomaly"] is False


def test_detect_anomaly_serie_estavel_com_ruido_raramente_sinaliza():
    # Antes o modelo era treinado incluindo a sessão avaliada e marcava
    # ~`contamination` (15%) das séries estáveis. Semente fixa = determinístico.
    import numpy as np

    rng = np.random.default_rng(0)
    series = [list(60 + rng.normal(0, 2, 12)) for _ in range(40)]
    sinalizadas = sum(anomaly_detection.detect_anomaly(v)["isAnomaly"] for v in series)

    assert sinalizadas <= 2  # <= 5%


def test_detect_anomaly_treina_sem_a_sessao_avaliada(monkeypatch):
    fits = []
    original_fit = anomaly_detection.IsolationForest.fit

    def _spy_fit(self, X, *args, **kwargs):
        fits.append(len(X))
        return original_fit(self, X, *args, **kwargs)

    monkeypatch.setattr(anomaly_detection.IsolationForest, "fit", _spy_fit)
    anomaly_detection.detect_anomaly([60, 61, 59, 62, 60, 58, 61, 59, 10])

    assert fits == [8]
