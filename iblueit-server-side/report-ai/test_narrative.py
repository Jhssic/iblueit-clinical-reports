"""
Testes do núcleo de geração/validação do relatório narrativo.

A chamada real à API da Groq nunca é feita aqui (sem rede, sem chave) — o
cliente `openai.OpenAI` é substituído por um fake nos testes de
`_generate_via_llm`, só pra exercitar a lógica em volta dela (parsing da
resposta, fallback pro template em caso de falha), que é o que de fato
mitiga o risco de alucinação (RF05/FA03).
"""

import openai

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


def _make_fake_openai(content=None, raise_error=False):
    """Fake mínimo pro cliente `openai.OpenAI` — só o suficiente pra
    `client.chat.completions.create(**kwargs)` funcionar nos testes."""

    class _FakeCompletions:
        @staticmethod
        def create(**kwargs):
            if raise_error:
                raise RuntimeError("Groq indisponível (simulado)")
            message = type("Msg", (), {"content": content})()
            choice = type("Choice", (), {"message": message})()
            return type("Resp", (), {"choices": [choice]})()

    class _FakeChat:
        completions = _FakeCompletions()

    class _FakeOpenAI:
        def __init__(self, *args, **kwargs):
            self.chat = _FakeChat()

    return _FakeOpenAI


def test_generate_via_llm_sucesso_usa_resposta_do_modelo(monkeypatch):
    monkeypatch.setattr(
        openai,
        "OpenAI",
        _make_fake_openai(
            content='{"resumoSessao": "Resumo via LLM.", '
            '"analiseComparativa": "DJ manteve-se estável em relação ao período anterior."}'
        ),
    )

    payload = {
        "device": "Pitaco",
        "period": {"start": "2026-01-01", "end": "2026-01-07"},
        "sessionCount": 3,
        "isFirstReport": False,
        "currentMetrics": {"DJ": 0.5},
        "previousMetrics": {"DJ": 0.5},
        "metricSources": {},
        "patientContext": {},
    }
    result = narrative._generate_via_llm(payload, api_key="fake-key")

    assert result["generatedBy"] == "llm"
    assert result["resumoSessao"] == "Resumo via LLM."
    assert "estável" in result["analiseComparativa"]
    assert result["coerenciaVerificada"] is True
    assert result["avisosCoerencia"] == []


def test_generate_via_llm_sinaliza_incoerencia_com_tendencia_real(monkeypatch):
    # DJ caiu de verdade (0.68 -> 0.40), mas o texto diz "melhora" — _check_coherence
    # deve pegar essa contradição (caso real que motivou a checagem, RF05/FA03).
    monkeypatch.setattr(
        openai,
        "OpenAI",
        _make_fake_openai(
            content='{"resumoSessao": "Resumo via LLM.", '
            '"analiseComparativa": "DJ apresentou melhora significativa em relação ao período anterior."}'
        ),
    )

    payload = {
        "device": "Pitaco",
        "period": {"start": "2026-01-01", "end": "2026-01-07"},
        "sessionCount": 3,
        "isFirstReport": False,
        "currentMetrics": {"DJ": 0.40},
        "previousMetrics": {"DJ": 0.68},
        "metricSources": {},
        "patientContext": {},
    }
    result = narrative._generate_via_llm(payload, api_key="fake-key")

    assert result["coerenciaVerificada"] is False
    assert any(a["metrica"] == "DJ" for a in result["avisosCoerencia"])


def test_generate_via_llm_fallback_quando_chamada_falha(monkeypatch):
    monkeypatch.setattr(openai, "OpenAI", _make_fake_openai(raise_error=True))

    payload = {
        "device": "Pitaco",
        "period": {"start": "2026-01-01", "end": "2026-01-07"},
        "sessionCount": 2,
        "isFirstReport": True,
        "currentMetrics": {"DJ": 0.6, "EB": 3},
        "metricSources": {},
        "patientContext": {},
    }
    result = narrative._generate_via_llm(payload, api_key="fake-key")

    assert result["generatedBy"] == "template"
    assert "sessão de referência inicial" in result["analiseComparativa"]


def test_generate_via_llm_fallback_quando_resposta_nao_e_json(monkeypatch):
    # Resposta não-JSON (modelo pequeno às vezes ignora a instrução) também
    # deve cair pro template, não estourar erro.
    monkeypatch.setattr(openai, "OpenAI", _make_fake_openai(content="isso não é um JSON válido"))

    payload = {
        "device": "Pitaco",
        "period": {"start": "2026-01-01", "end": "2026-01-07"},
        "sessionCount": 1,
        "isFirstReport": True,
        "currentMetrics": {"DJ": 0.6},
        "metricSources": {},
        "patientContext": {},
    }
    result = narrative._generate_via_llm(payload, api_key="fake-key")

    assert result["generatedBy"] == "template"
