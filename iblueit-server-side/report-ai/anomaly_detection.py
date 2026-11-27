"""
RF10 — detecção de anomalia em sessões do paciente via Isolation Forest.

Por que Isolation Forest e não só um limiar fixo (z-score simples): o
algoritmo isola cada sessão com base em quantas divisões aleatórias dos dados
são necessárias pra separá-la do resto — sessões anômalas (muito distantes do
padrão normal daquele paciente) exigem poucas divisões pra isolar, então
recebem um "anomaly score" mais negativo. Não presume distribuição normal nem
um limiar absoluto igual pra todo paciente.

A análise é UNIVARIADA: cada chamada recebe a série de uma única métrica
(DJ, PJ ou EB — ver alertEvaluation.js), não combinações entre métricas.

Treinado por paciente, com o próprio histórico de sessões dele — não existe
um modelo global, porque "normal" varia demais de paciente pra paciente
(condição, idade, capacidade respiratória de base).

Limitação conhecida: com poucas sessões (< MIN_SESSIONS) o modelo não tem
dado suficiente pra aprender um padrão confiável, então a função recusa a
classificação em vez de arriscar um falso positivo/negativo.
"""

import numpy as np
from sklearn.ensemble import IsolationForest

MIN_SESSIONS = 6
ROBUST_Z = 3.0

LOWER_IS_WORSE = "lower_is_worse"   # DJ, PJ: queda é piora
HIGHER_IS_WORSE = "higher_is_worse"  # EB (Escala de Borg): subida é piora


def _robust_spread(hist) -> float:
    """Dispersão típica do histórico: MAD escalado (≈ desvio padrão para
    dados normais, mas sem ser puxado por sessões atípicas). Com MAD zero
    (série quase constante, comum na EB), usa a amplitude do histórico; se
    nem isso houver, qualquer saída da faixa já é relevante."""
    median = np.median(hist)
    mad = float(np.median(np.abs(hist - median))) * 1.4826
    if mad > 0:
        return mad
    return float(hist.max() - hist.min()) / ROBUST_Z


def detect_anomaly(values: list[float], contamination: float = 0.15, direction: str = LOWER_IS_WORSE) -> dict:
    """
    Avalia se a sessão mais recente (values[-1]) é anômala em relação ao
    histórico do próprio paciente.

    - O modelo é treinado só em values[:-1]: treinar incluindo a sessão
      avaliada fazia o próprio Isolation Forest marcar ~`contamination` dos
      pontos (inclusive o último) como anômalos mesmo numa série estável.
    - Só conta como anomalia o desvio no sentido clínico de PIORA
      (`direction`) e além da faixa já vista no histórico: um salto de
      melhora não pode virar alerta de deterioração.

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

    history = np.array(values[:-1], dtype=float).reshape(-1, 1)
    latest = np.array([[float(values[-1])]])

    model = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42,
    )
    model.fit(history)

    # decision_function: quanto mais negativo, mais anômalo; <= 0 é o lado
    # anômalo do limiar aprendido (com dados discretos, como a EB, o ponto
    # costuma cair exatamente no limiar — por isso o "<=").
    latest_score = float(model.decision_function(latest)[0])
    is_outlier = latest_score <= 0

    # Limitação do Isolation Forest em 1 dimensão: todo valor além da faixa do
    # histórico recebe o MESMO score do ponto extremo do treino, seja ele 1
    # unidade ou 50 unidades além. Então o modelo sozinho não mede a
    # magnitude da piora — estas duas guardas completam a decisão:
    #  1) sentido clínico: só conta se a sessão saiu da faixa do histórico
    #     pelo lado ruim (abaixo do mínimo para DJ/PJ, acima do máximo para
    #     EB) — um salto de melhora nunca vira alerta de deterioração;
    #  2) magnitude: o desvio em relação à mediana precisa passar de
    #     ROBUST_Z x a dispersão típica do paciente (MAD), pra que ruído
    #     normal de uma série estável não dispare alerta.
    hist = history.ravel()
    median = float(np.median(hist))
    spread = _robust_spread(hist)
    if direction == HIGHER_IS_WORSE:
        fora_da_faixa = values[-1] > float(hist.max())
        desvio = values[-1] - median
    else:
        fora_da_faixa = values[-1] < float(hist.min())
        desvio = median - values[-1]
    desvio_relevante = desvio > ROBUST_Z * spread

    return {
        "evaluated": True,
        "reason": None,
        "isAnomaly": bool(is_outlier and fora_da_faixa and desvio_relevante),
        "anomalyScore": latest_score,
        "sessionCount": len(values),
    }
