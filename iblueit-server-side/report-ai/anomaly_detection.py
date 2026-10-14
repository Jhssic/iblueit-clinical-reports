"""
RF10 — detecção de anomalia em sessões do paciente via Isolation Forest.

Por que Isolation Forest e não só um limiar fixo (z-score simples): o
algoritmo isola cada sessão com base em quantas divisões aleatórias dos dados
são necessárias pra separá-la do resto — sessões anômalas (muito distantes do
padrão normal daquele paciente) exigem poucas divisões pra isolar, então
recebem um "anomaly score" mais negativo. Isso captura padrões multivariados
(ex: DJ caiu MAS Borg Scale também subiu junto) que uma regra única por
métrica não enxerga.

Treinado por paciente, com o próprio histórico de sessões dele — não existe
um modelo global, porque "normal" varia demais de paciente pra paciente
(condição, idade, capacidade respiratória de base).

Limitação conhecida: com poucas sessões (< MIN_SESSIONS) o modelo não tem
dado suficiente pra aprender um padrão confiável, então a função recusa a
classificação em vez de arriscar um falso positivo/negativo.
"""

from typing import Optional
import numpy as np
from sklearn.ensemble import IsolationForest

MIN_SESSIONS = 6


def detect_anomaly(values: list[float], contamination: float = 0.15) -> dict:
    """
    Avalia se a sessão mais recente (values[-1]) é anômala em relação ao
    histórico do próprio paciente (values[:-1] serve de base de treino).

    `contamination` é a proporção esperada de sessões anômalas no histórico
    (parâmetro do Isolation Forest) — equivalente à "sensibilidade" exposta
    na UI de configuração de alertas.
    """
    if len(values) < MIN_SESSIONS:
        return {
            "evaluated": False,
            "reason": f"histórico insuficiente ({len(values)} sessões, mínimo {MIN_SESSIONS})",
            "isAnomaly": False,
            "anomalyScore": None,
        }

    X = np.array(values, dtype=float).reshape(-1, 1)

    model = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42,
    )
    model.fit(X)

    # decision_function: quanto mais negativo, mais anômalo. predict: -1 = anômalo, 1 = normal.
    scores = model.decision_function(X)
    labels = model.predict(X)

    latest_score = float(scores[-1])
    latest_label = int(labels[-1])

    return {
        "evaluated": True,
        "reason": None,
        "isAnomaly": latest_label == -1,
        "anomalyScore": latest_score,
        "sessionCount": len(values),
    }
