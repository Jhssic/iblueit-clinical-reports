"""
Testes do núcleo de geração/validação do relatório narrativo.

Cobre as partes que não dependem de chamada real ao LLM (determinísticas) —
a chamada via Groq (_generate_via_llm) não é testada aqui porque depende de
rede/chave de API; o que importa testar é a lógica de validação em volta
dela, que é o que de fato mitiga o risco de alucinação (RF05/FA03).
"""

import narrative


def test_pct_change_calcula_percentual_corretamente():
    assert narrative._pct_change(50, 100) == -50.0
    assert narrative._pct_change(150, 100) == 50.0


def test_pct_change_retorna_none_sem_valor_anterior():
    assert narrative._pct_change(50, None) is None
    assert narrative._pct_change(50, 0) is None


def test_trend_word():
    assert narrative._trend_word(10) == "melhora"
    assert narrative._trend_word(-10) == "redução"
    assert narrative._trend_word(0) == "estabilidade"
    assert narrative._trend_word(None) is None


def test_objective_trends_sem_periodo_anterior():
    assert narrative._objective_trends({"DJ": 0.5}, None) == {}


def test_objective_trends_calcula_tendencia_real():
    current = {"DJ": 0.40, "EB": 5}
    previous = {"DJ": 0.68, "EB": 5}
    trends = narrative._objective_trends(current, previous)
    assert trends["DJ"] == "redução"
    assert trends["EB"] == "estabilidade"


def test_check_coherence_pega_contradicao_entre_texto_e_numero():
    """Caso real que motivou o _check_coherence (ver review do PR): o LLM
    disse 'melhora' pra uma métrica que na verdade caiu."""
    current = {"DJ": 0.40}
    previous = {"DJ": 0.68}
    trends = narrative._objective_trends(current, previous)

    resumo = "O DJ apresentou uma melhora significativa no desempenho em relação ao período anterior."
    avisos = narrative._check_coherence(resumo, None, trends)

    assert len(avisos) == 1
    assert avisos[0]["metrica"] == "DJ"
    assert avisos[0]["esperado"] == "redução"


def test_check_coherence_nao_falsifica_quando_texto_bate_com_numero():
    current = {"DJ": 0.40}
    previous = {"DJ": 0.68}
    trends = narrative._objective_trends(current, previous)

    resumo = "O DJ apresentou uma redução no período em relação ao anterior."
    avisos = narrative._check_coherence(resumo, None, trends)

    assert avisos == []


def test_check_coherence_ignora_tendencia_de_estabilidade():
    # estabilidade é ambígua demais em texto livre pra validar com confiança
    current = {"EB": 5}
    previous = {"EB": 5}
    trends = narrative._objective_trends(current, previous)

    avisos = narrative._check_coherence("O EB se manteve em qualquer direção aleatória.", None, trends)
    assert avisos == []


def test_generate_sem_chave_de_api_usa_template_deterministico(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    payload = {
        "device": "Pitaco",
        "period": {"start": "2026-01-01", "end": "2026-01-07"},
        "sessionCount": 3,
        "isFirstReport": True,
        "currentMetrics": {"DJ": 0.7, "EB": 3},
        "metricSources": {"DJ": "plataformoverviews", "EB": "plataformoverviews"},
    }
    result = narrative.generate(payload)

    assert result["generatedBy"] == "template"
    assert result["coerenciaVerificada"] is True
    assert result["avisosCoerencia"] == []
    assert "Pitaco" in result["resumoSessao"]
