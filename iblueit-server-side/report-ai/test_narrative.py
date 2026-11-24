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


def test_round_borg_arredonda_para_inteiro():
    assert narrative._round_borg({"DJ": 0.5, "EB": 4.33})["EB"] == 4
    assert narrative._round_borg({"DJ": 0.5, "EB": 4.6})["EB"] == 5


def test_round_borg_sem_eb_nao_quebra():
    assert narrative._round_borg({"DJ": 0.5}) == {"DJ": 0.5}
    assert narrative._round_borg(None) is None


def test_build_evolucao_sem_avaliacao_inicial_retorna_none():
    assert narrative._build_evolucao({"DJ": 0.5}, None) is None


def test_build_evolucao_compara_as_7_variaveis_principais():
    current = {"DJ": 0.80, "PJ": 120, "CGc": 5.0, "FR": 16, "PEmax": 90, "PImax": 95, "EB": 3.6}
    inicial = {"DJ": 0.50, "PJ": 100, "CGc": 5.0, "FR": 16, "PEmax": 90, "PImax": 95, "EB": 5.0}
    evolucao = narrative._build_evolucao(current, inicial)

    assert "Desempenho do Jogador (DJ)" in evolucao
    assert "Pontos da Jogada (PJ)" in evolucao
    assert "estável em relação à avaliação inicial" in evolucao  # CGc/FR/PEmax/PImax
    # EB: 5 -> 4 (arredondado de 3.6) é redução, não deve aparecer como estável
    assert "Escala de Borg (EB) apresentou redução" in evolucao


def test_objective_trends_arredonda_eb_antes_de_comparar():
    # 4.6 arredonda pra 5, igual ao inicial — não deve contar como "melhora"
    trends = narrative._objective_trends({"EB": 4.6}, {"EB": 5})
    assert trends["EB"] == "estabilidade"


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
    assert "avaliação inicial" in result["evolucao"]


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
            '"evolucao": "DJ manteve-se estável em relação à avaliação inicial."}'
        ),
    )

    payload = {
        "device": "Pitaco",
        "period": {"start": "2026-01-01", "end": "2026-01-07"},
        "sessionCount": 3,
        "isFirstReport": False,
        "currentMetrics": {"DJ": 0.5},
        "initialMetrics": {"DJ": 0.5},
        "metricSources": {},
        "patientContext": {},
    }
    result = narrative._generate_via_llm(payload, api_key="fake-key")

    assert result["generatedBy"] == "llm"
    assert result["resumoSessao"] == "Resumo via LLM."
    assert "estável" in result["evolucao"]
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
            '"evolucao": "DJ apresentou melhora significativa em relação à avaliação inicial."}'
        ),
    )

    payload = {
        "device": "Pitaco",
        "period": {"start": "2026-01-01", "end": "2026-01-07"},
        "sessionCount": 3,
        "isFirstReport": False,
        "currentMetrics": {"DJ": 0.40},
        "initialMetrics": {"DJ": 0.68},
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
    assert "avaliação inicial" in result["evolucao"]


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


# ---------------------------------------------------------------------------
# Casos de borda dos helpers de formatação/validação
# ---------------------------------------------------------------------------


def test_format_metrics_for_prompt_sem_metricas_retorna_traco():
    assert narrative._format_metrics_for_prompt(None) == "—"
    assert narrative._format_metrics_for_prompt({}) == "—"


def test_format_metrics_for_prompt_ignora_valores_nulos():
    assert narrative._format_metrics_for_prompt({"DJ": None}) == "—"


def test_format_metrics_for_prompt_usa_nome_completo_e_unidade():
    texto = narrative._format_metrics_for_prompt({"EB": 3, "XYZ": 1})
    assert "EB (Escala de Borg, 0–10): 3" in texto
    # Sigla desconhecida: usa a própria sigla como nome, sem unidade.
    assert "XYZ (XYZ, ): 1" in texto


def test_format_date_formatos():
    assert narrative._format_date(None) == "—"
    assert narrative._format_date("") == "—"
    assert narrative._format_date("2026-01-07T10:00:00Z") == "07/01/2026"
    # Data inválida é devolvida como veio, sem estourar erro.
    assert narrative._format_date("ontem") == "ontem"


def test_build_resumo_com_todas_as_metricas_e_sessao_no_singular():
    resumo = narrative._build_resumo(
        "Pitaco",
        {"start": "2026-01-01", "end": "2026-01-07"},
        1,
        {"DJ": 0.5, "PJ": 120.0, "FR": 18.0, "EB": 4},
    )
    assert "1 sessão de" in resumo
    assert "01/01/2026 a 07/01/2026" in resumo
    assert "(DJ) médio registrado foi de 0.50" in resumo
    assert "(PJ) foi de 120.0 pontos" in resumo
    assert "(FR) média observada foi de 18 rpm" in resumo
    assert "Escala de Borg" in resumo


def test_build_evolucao_ignora_metrica_ausente_ou_com_base_zero():
    # PJ só no atual, CGc com valor inicial 0 (percentual indefinido) — ambos
    # ficam de fora; sem nenhuma métrica comparável o resultado é None.
    assert narrative._build_evolucao({"PJ": 10, "CGc": 5}, {"CGc": 0}) is None


def test_build_evolucao_estabilidade_e_reducao():
    texto = narrative._build_evolucao({"DJ": 0.5, "FR": 10}, {"DJ": 0.5, "FR": 20})
    assert "Desempenho do Jogador (DJ) manteve-se estável" in texto
    assert "Frequência Respiratória (FR) apresentou redução de 50.0%" in texto


def test_objective_trends_ignora_base_zero():
    assert narrative._objective_trends({"DJ": 0.5}, {"DJ": 0}) == {}


def test_check_acronym_expansions_detecta_sigla_com_nome_inventado():
    avisos = narrative._check_acronym_expansions(
        "O EB (Excesso de Breathe) ficou em 3.", {"EB": 3, "OUTRA": 1}
    )
    assert avisos == [
        {
            "metrica": "EB",
            "esperado": "Escala de Borg",
            "trechoSuspeito": "EB (Excesso de Breathe)",
        }
    ]


def test_check_acronym_expansions_aceita_nome_correto_e_entradas_vazias():
    assert narrative._check_acronym_expansions("EB (escala de borg) = 3", {"EB": 3}) == []
    assert narrative._check_acronym_expansions("", {"EB": 3}) == []
    assert narrative._check_acronym_expansions("texto", None) == []


def test_check_coherence_sem_texto_retorna_lista_vazia():
    assert narrative._check_coherence(None, None, {"DJ": "melhora"}) == []


def test_check_coherence_sem_tendencias_so_confere_siglas():
    avisos = narrative._check_coherence(
        "EB (Esforço Bruto) alto.", None, {}, {"EB": 5}
    )
    assert len(avisos) == 1
    assert avisos[0]["metrica"] == "EB"


def test_check_coherence_pega_reducao_descrita_como_melhora_pelo_nome_completo():
    avisos = narrative._check_coherence(
        "A Frequência Respiratória aumentou bastante.",
        None,
        {"FR": "redução"},
    )
    assert avisos and avisos[0]["esperado"] == "redução"


def test_build_dados_brutos_ignora_sigla_desconhecida_e_nulos():
    linhas = narrative._build_dados_brutos(
        {"DJ": 0.5, "PJ": None, "XYZ": 1}, {"DJ": "PlataformOverview"}
    )
    assert linhas == [
        {
            "metrica": "Desempenho do Jogador",
            "sigla": "DJ",
            "valor": 0.5,
            "unidade": "índice 0–1",
            "sourceCollection": "PlataformOverview",
        }
    ]


def test_generate_com_chave_delega_para_llm(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "fake-key")
    chamado = {}

    def _fake_llm(payload, api_key):
        chamado["api_key"] = api_key
        return {"generatedBy": "llm"}

    monkeypatch.setattr(narrative, "_generate_via_llm", _fake_llm)
    assert narrative.generate({"currentMetrics": {}}) == {"generatedBy": "llm"}
    assert chamado["api_key"] == "fake-key"


def test_generate_sem_chave_relatorio_seguinte_inclui_evolucao(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    result = narrative.generate(
        {
            "isFirstReport": False,
            "currentMetrics": {"DJ": 0.6},
            "initialMetrics": {"DJ": 0.3},
            "missingOptionalFields": ["SpO2min"],
        }
    )
    assert "melhora de 100.0%" in result["evolucao"]
    assert result["missingOptionalFields"] == ["SpO2min"]


# ---------------------------------------------------------------------------
# Tratamento da resposta do LLM
# ---------------------------------------------------------------------------

_PAYLOAD_LLM = {
    "device": "Pitaco",
    "period": {"start": "2026-01-01", "end": "2026-01-07"},
    "sessionCount": 3,
    "isFirstReport": False,
    "currentMetrics": {"DJ": 0.5},
    "initialMetrics": {"DJ": 0.5},
    "metricSources": {},
    "patientContext": {},
}


def test_generate_via_llm_remove_bloco_markdown_da_resposta(monkeypatch):
    monkeypatch.setattr(
        openai,
        "OpenAI",
        _make_fake_openai(content='```json\n{"resumoSessao": "Resumo cercado."}\n```'),
    )
    result = narrative._generate_via_llm(_PAYLOAD_LLM, api_key="fake-key")
    assert result["generatedBy"] == "llm"
    assert result["resumoSessao"] == "Resumo cercado."
    assert result["evolucao"] is None


def test_generate_via_llm_aceita_chaves_alternativas_e_converte_objeto_em_texto(monkeypatch):
    monkeypatch.setattr(
        openai,
        "OpenAI",
        _make_fake_openai(
            content='{"summary": "Resumo alternativo.", '
            '"analiseComparativa": {"DJ": "estável"}}'
        ),
    )
    result = narrative._generate_via_llm(_PAYLOAD_LLM, api_key="fake-key")
    assert result["resumoSessao"] == "Resumo alternativo."
    # Objeto devolvido pelo modelo vira texto JSON (sem escapar acentos).
    assert result["evolucao"] == '{"DJ": "estável"}'


def test_generate_via_llm_json_sem_resumo_cai_pro_template(monkeypatch):
    monkeypatch.setattr(
        openai, "OpenAI", _make_fake_openai(content='{"resumoSessao": ""}')
    )
    result = narrative._generate_via_llm(_PAYLOAD_LLM, api_key="fake-key")
    assert result["generatedBy"] == "template"
    assert result["coerenciaVerificada"] is True


def test_strip_markdown_fence_casos():
    assert narrative._strip_markdown_fence('{"a": 1}') == '{"a": 1}'
    assert narrative._strip_markdown_fence('```json\n{"a": 1}\n```') == '{"a": 1}'
    assert narrative._strip_markdown_fence('```JSON {"a": 1} ```') == '{"a": 1}'
    assert narrative._strip_markdown_fence('```\n{"a": 1}\n```') == '{"a": 1}'
    # Fence aberta sem fechamento: remove só a abertura.
    assert narrative._strip_markdown_fence('```json\n{"a": 1}') == '{"a": 1}'
