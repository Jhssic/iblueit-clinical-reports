"""
Geração de texto narrativo clínico.

Hoje usa um template determinístico (sem custo, sem chave de API) para que o
fluxo ponta-a-ponta funcione sem depender de uma chave de LLM. Quando houver
uma chave configurada (GROQ_API_KEY), a função `generate` troca
automaticamente para a chamada real ao modelo via Groq, mantendo o
mesmo formato de resposta — nenhuma outra camada do sistema precisa mudar.
"""

import logging
import math
import os
import re
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Datas do relatório são exibidas no fuso de Brasília: o front manda o fim do
# período como endOf('day') local (ex: 07/01 23:59 em Brasília = 08/01 02:59Z),
# e formatar em UTC mostrava um dia a mais. Se a base de fusos (tzdata) não
# estiver disponível no container, cai pra UTC-3 fixo — o Brasil não tem
# horário de verão desde 2019, então o resultado é o mesmo.
try:
    from zoneinfo import ZoneInfo

    TZ_BRASIL = ZoneInfo("America/Sao_Paulo")
except Exception:  # ZoneInfoNotFoundError / tzdata ausente
    TZ_BRASIL = timezone(timedelta(hours=-3), "UTC-03:00")

AVISO_REVISAO = (
    "Este relatório foi gerado automaticamente por IA e deve ser revisado "
    "pelo profissional responsável antes de ser incorporado ao prontuário clínico."
)

TENDENCIA_MELHORA = "melhora"
TENDENCIA_REDUCAO = "redução"
TENDENCIA_PIORA = "piora"
TENDENCIA_AUMENTO = "aumento"
TENDENCIA_ESTABILIDADE = "estabilidade"

TEXTO_AVALIACAO_INICIAL = (
    "Esta é a avaliação inicial do paciente — ainda não há dados anteriores "
    "para comparação de evolução."
)

# Unidade "do dispositivo": PEmax/PImax vêm de Pacient.capacities<Device>
# (expPeakFlow/insPeakFlow) e FLi/FLe das amostras de flowdatadevices, ou seja,
# da leitura crua do sensor de cada dispositivo — a unidade real depende de
# qual foi usado (ver `_metric_unit`). Rotular tudo como cmH2O estava errado.
UNIDADE_DO_DISPOSITIVO = "unidade do dispositivo"

METRIC_LABELS = {
    "DJ": ("Desempenho do Jogador", "índice 0–1"),
    "PJ": ("Pontos da Jogada", "pontos"),
    # CGc vem de gameparameters.ObjectSpeedFactor (1.0–3.0): é um fator de
    # velocidade do jogo, adimensional — não é pressão.
    "CGc": ("Carga Corrente", "fator adimensional"),
    "FR": ("Frequência Respiratória", "rpm"),
    "PEmax": ("Pressão Expiratória Máxima", UNIDADE_DO_DISPOSITIVO),
    "PImax": ("Pressão Inspiratória Máxima", UNIDADE_DO_DISPOSITIVO),
    "TEmax": ("Tempo Expiratório Máximo", "s"),
    "TImax": ("Tempo Inspiratório Máximo", "s"),
    "SpO2min": ("Saturação de Oxigênio Mínima", "%"),
    "FLi": ("Fluxo Inspiratório", UNIDADE_DO_DISPOSITIVO),
    "FLe": ("Fluxo Expiratório", UNIDADE_DO_DISPOSITIVO),
    "EB": ("Escala de Borg", "0–10"),
}

# Unidade da leitura de cada dispositivo — a mesma convenção usada nos
# gráficos do Health InfoCharts (Pitaco em L/min, Cinta em cm). Para o
# Manovacuômetro o front antigo exibe "L/m³", que não é unidade de nada; o
# aparelho mede pressão respiratória, por isso cmH2O aqui.
DEVICE_UNITS = {
    "Pitaco": "L/min",
    "Manovacuômetro": "cmH2O",
    "Cinta": "cm",
}
DEVICE_DEPENDENT_METRICS = frozenset({"PEmax", "PImax", "FLi", "FLe"})

# Sentido clínico de cada métrica: na EB (Escala de Borg, esforço percebido)
# valor MAIOR é PIOR, então um aumento não pode virar "melhora" no texto.
# FR (capacidade registrada na calibração) não tem um sentido clínico único
# — mais rápido não é necessariamente melhor nem pior —, por isso é neutra
# ("aumento"/"redução"). As demais seguem "maior é melhor".
HIGHER_IS_BETTER = "higher_is_better"
LOWER_IS_BETTER = "lower_is_better"
NEUTRAL = "neutral"
METRIC_DIRECTION = {
    "EB": LOWER_IS_BETTER,
    "FR": NEUTRAL,
}


def _direction(key):
    return METRIC_DIRECTION.get(key, HIGHER_IS_BETTER)


def _metric_unit(key, device=None):
    if key in DEVICE_DEPENDENT_METRICS:
        return DEVICE_UNITS.get(device, UNIDADE_DO_DISPOSITIVO)
    return METRIC_LABELS.get(key, (key, ""))[1]


def _format_metrics_for_prompt(metrics, device=None):
    """Formata as métricas com nome completo + unidade (ex: 'EB (Escala de
    Borg, 0–10): 3.00'), em vez de só a sigla crua — sem isso o LLM já
    inventou expansões erradas pra sigla (ex: 'EB' virou 'Excesso de Breathe'
    em vez de 'Escala de Borg'), por nunca ter recebido o nome por extenso."""
    if not metrics:
        return "—"
    linhas = []
    for key, valor in metrics.items():
        if valor is None:
            continue
        label = METRIC_LABELS.get(key, (key, ""))[0]
        linhas.append(f"{key} ({label}, {_metric_unit(key, device)}): {valor}")
    return "\n".join(linhas) if linhas else "—"


def _pct_change(current, previous):
    if previous is None or previous == 0:
        return None
    return round(((current - previous) / previous) * 100, 1)


def _round_half_up(value):
    """`round()` do Python arredonda "pro par" (2.5 -> 2, 3.5 -> 4); na
    Escala de Borg o esperado clinicamente é o arredondamento comum (2.5 -> 3)."""
    return int(math.floor(value + 0.5))


def _round_borg(metrics):
    """Escala de Borg (EB) é um valor inteiro de 0-10 por definição clínica —
    a média de várias sessões pode gerar um real (ex: 4.33), que não faz
    sentido nessa escala. Arredonda antes de usar em qualquer texto/comparação
    sintetizada (pedido do professor no piloto com fisioterapeuta)."""
    if not metrics or metrics.get("EB") is None:
        return metrics
    rounded = dict(metrics)
    rounded["EB"] = _round_half_up(rounded["EB"])
    return rounded


def _trend_word(diff, key=None):
    """Palavra de tendência a partir do sinal da variação, respeitando o
    sentido clínico da métrica (ver METRIC_DIRECTION): EB subindo é "piora",
    FR muda só como "aumento"/"redução". Sem `key`, assume "maior é melhor"."""
    if diff is None:
        return None
    if diff == 0:
        return TENDENCIA_ESTABILIDADE
    direcao = _direction(key)
    subiu = diff > 0
    if direcao == LOWER_IS_BETTER:
        return TENDENCIA_PIORA if subiu else TENDENCIA_MELHORA
    if direcao == NEUTRAL:
        return TENDENCIA_AUMENTO if subiu else TENDENCIA_REDUCAO
    return TENDENCIA_MELHORA if subiu else TENDENCIA_REDUCAO


def _raw_direction(key, tendencia):
    """Inverso de `_trend_word`: dado o termo de tendência da métrica, diz se
    o número subiu ("up") ou desceu ("down"). None para estabilidade."""
    direcao = _direction(key)
    if direcao == LOWER_IS_BETTER:
        mapa = {TENDENCIA_PIORA: "up", TENDENCIA_MELHORA: "down"}
    elif direcao == NEUTRAL:
        mapa = {TENDENCIA_AUMENTO: "up", TENDENCIA_REDUCAO: "down"}
    else:
        mapa = {TENDENCIA_MELHORA: "up", TENDENCIA_REDUCAO: "down"}
    return mapa.get(tendencia)


def _format_date(iso_str):
    """dd/mm/aaaa no fuso de Brasília. Data sem fuso (ex: '2026-01-07') é
    tratada como já local e não é convertida."""
    if not iso_str:
        return "—"
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    except ValueError:
        return iso_str
    if dt.tzinfo is not None:
        dt = dt.astimezone(TZ_BRASIL)
    return dt.strftime("%d/%m/%Y")


def _format_value(key, value):
    # EB é inteira por definição (ver `_round_borg`) — "3.00" sugeriria uma
    # precisão que a escala não tem.
    if key == "EB":
        return f"{value:.0f}"
    return f"{value:.2f}"


def _format_trigger(value):
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def describe_alert(alert):
    """Texto de um alerta disparado (RF09), no mesmo tom da aba Alertas do
    front. Para EB as condições valem no sentido de piora (ver
    alertEvaluation.js): "Queda percentual >" vira aumento e "Abaixo do valor"
    vira acima do valor."""
    metric = alert.get("metric")
    condition = alert.get("condition")
    trigger = _format_trigger(alert.get("triggerValue"))
    label = METRIC_LABELS.get(metric, (metric, ""))[0]
    piora_para_cima = _direction(metric) == LOWER_IS_BETTER
    if condition == "Queda percentual >":
        sentido = "aumento" if piora_para_cima else "queda"
        detalhe = f"{sentido} percentual maior que {trigger}% entre as duas últimas sessões"
    elif condition == "Abaixo do valor":
        detalhe = (
            f"acima de {trigger} na última sessão (sentido de piora)"
            if piora_para_cima
            else f"abaixo de {trigger} na última sessão"
        )
    elif condition == "Anomalia (IA)":
        detalhe = f"sessão mais recente identificada como anômala pelo modelo de IA (sensibilidade {trigger}%)"
    else:
        detalhe = f"piora em {trigger} sessões consecutivas"
    return f"{label} ({metric}): {detalhe}"


def _build_alertas(alerts):
    if not alerts:
        return None
    itens = "; ".join(describe_alert(a) for a in alerts)
    return f"Alertas clínicos disparados até o fim do período: {itens}."


def _build_resumo(device, period, session_count, current_metrics):
    sessao_txt = "sessão" if session_count == 1 else "sessões"
    periodo_inicio = _format_date(period.get("start"))
    periodo_fim = _format_date(period.get("end"))
    partes = [
        f"No período de {periodo_inicio} a {periodo_fim}, "
        f"o paciente realizou {session_count} {sessao_txt} de reabilitação respiratória "
        f"utilizando o dispositivo {device}."
    ]

    dj = current_metrics.get("DJ")
    pj = current_metrics.get("PJ")
    fr = current_metrics.get("FR")
    eb = current_metrics.get("EB")

    if dj is not None:
        partes.append(f"O Desempenho do Jogador (DJ) médio registrado foi de {dj:.2f}.")
    if pj is not None:
        partes.append(f"A pontuação média (PJ) foi de {pj:.1f} pontos por sessão.")
    if fr is not None:
        # FR vem de Pacient.capacities<Device> (calibração), não das sessões
        # do período — não é uma média "observada" no período.
        partes.append(
            f"A frequência respiratória (FR) registrada na calibração do dispositivo é de {fr:.0f} rpm."
        )
    if eb is not None:
        partes.append(f"A Escala de Borg (esforço percebido) média foi de {eb:.0f}.")

    return " ".join(partes)


# As 7 variáveis principais exibidas nos cards do relatório (feedback do piloto
# com o professor) — base tanto da seção "Evolução" quanto da checagem de
# coerência.
MAIN_METRICS = ("DJ", "PJ", "CGc", "FR", "PEmax", "PImax", "EB")


def _build_evolucao(current_metrics, initial_metrics):
    """Compara o estado atual com a avaliação inicial do paciente (primeiro
    relatório, mesmo dispositivo) — não com o período imediatamente anterior.
    Renomeado de "Análise comparativa" para "Evolução" a pedido do professor
    no piloto com o fisioterapeuta."""
    if not initial_metrics:
        return None

    current_metrics = _round_borg(current_metrics)
    initial_metrics = _round_borg(initial_metrics)

    frases = []
    for key in MAIN_METRICS:
        cur = current_metrics.get(key)
        inicial = initial_metrics.get(key)
        if cur is None or inicial is None:
            continue
        label, _ = METRIC_LABELS[key]
        tendencia = _trend_word(cur - inicial, key)
        if tendencia == TENDENCIA_ESTABILIDADE:
            frases.append(f"{label} ({key}) manteve-se estável em relação à avaliação inicial.")
            continue
        de_para = f"(de {_format_value(key, inicial)} para {_format_value(key, cur)})"
        pct = _pct_change(cur, inicial)
        if pct is None:
            # Base zero (comum na EB): percentual indefinido, mas a métrica
            # não pode simplesmente sumir da Evolução — mostra a diferença absoluta.
            frases.append(
                f"{label} ({key}) apresentou {tendencia} de {_format_value(key, abs(cur - inicial))} "
                f"em valor absoluto em relação à avaliação inicial {de_para}."
            )
        else:
            frases.append(
                f"{label} ({key}) apresentou {tendencia} de {abs(pct)}% em relação à "
                f"avaliação inicial {de_para}."
            )

    if not frases:
        return None
    return " ".join(frases)


def _objective_trends(current_metrics, initial_metrics):
    """Tendência esperada por métrica (melhora/redução/estabilidade), calculada
    diretamente dos números — usada como referência objetiva para checar se o
    texto gerado pelo LLM não contradiz os dados (ver `_check_coherence`)."""
    if not initial_metrics:
        return {}
    current_metrics = _round_borg(current_metrics)
    initial_metrics = _round_borg(initial_metrics)
    trends = {}
    for key in MAIN_METRICS:
        cur = current_metrics.get(key)
        inicial = initial_metrics.get(key)
        if cur is None or inicial is None:
            continue
        # Sinal da diferença absoluta (não do percentual): com base zero o
        # percentual é indefinido, mas a tendência continua conhecida.
        trends[key] = _trend_word(cur - inicial, key)
    return trends


# Palavras que descrevem o número subindo/descendo e palavras de juízo
# clínico (melhora/piora). Quais delas são "coerentes" com um aumento depende
# do sentido da métrica — ver `_keywords_for`.
_SUBIDA_KEYWORDS = ("aument", "subiu", "elevaç", "elevou", "cresc")
_DESCIDA_KEYWORDS = ("reduç", "reduziu", "queda", "caiu", "diminui", "declín")
_BOM_KEYWORDS = ("melhora", "melhorou", "evolu", "progrediu")
_RUIM_KEYWORDS = ("piora", "piorou")


def _keywords_for(key):
    """(palavras coerentes com o número subindo, palavras coerentes com o
    número descendo) para a métrica. Na EB, "piora" acompanha a subida; na FR
    (neutra), melhora/piora não indicam sentido e são ignoradas."""
    direcao = _direction(key)
    if direcao == LOWER_IS_BETTER:
        return _SUBIDA_KEYWORDS + _RUIM_KEYWORDS, _DESCIDA_KEYWORDS + _BOM_KEYWORDS
    if direcao == NEUTRAL:
        return _SUBIDA_KEYWORDS, _DESCIDA_KEYWORDS
    return _SUBIDA_KEYWORDS + _BOM_KEYWORDS, _DESCIDA_KEYWORDS + _RUIM_KEYWORDS


_NUMERIC_PAREN = re.compile(r"[-+−–]?\s*\d")


def _check_acronym_expansions(texto, metrics):
    """Confronta cada sigla mencionada no texto com o nome completo que o
    próprio modelo atribuiu a ela entre parênteses — pega o caso em que o
    LLM inventa uma expansão errada (ex: 'EB (Excesso de Breathe)' em vez de
    'EB (Escala de Borg)'), mesmo quando o prompt já manda o nome certo."""
    if not texto or not metrics:
        return []

    avisos = []
    for key in metrics:
        label, _ = METRIC_LABELS.get(key, (None, None))
        if not label:
            continue
        padrao = re.compile(rf"\b{re.escape(key)}\b\s*\(([^)]+)\)", re.IGNORECASE)
        for match in padrao.finditer(texto):
            expansao = match.group(1).strip()
            # "DJ (0,62)": parêntese com o valor, não com o nome — nada a conferir.
            if _NUMERIC_PAREN.match(expansao):
                continue
            # "EB (Escala de Borg, 0–10)": nome certo seguido de unidade/escala.
            if not expansao.lower().startswith(label.lower()):
                avisos.append({
                    "metrica": key,
                    "esperado": label,
                    "trechoSuspeito": match.group(0),
                })
    return avisos


def _check_coherence(resumo, analise, objective_trends, current_metrics=None):
    """Confronta o texto narrativo gerado pelo LLM com a tendência real das
    métricas (RF05/FA03 — mitigação do risco de alucinação levantado na review
    do PR). Só sinaliza contradições diretas (melhora vs. redução); tendências
    de estabilidade não geram aviso por serem mais ambíguas no texto livre.
    Também confere se o modelo não inventou o nome por extenso de alguma sigla.
    """
    texto = " ".join(t for t in (resumo, analise) if t)
    if not texto:
        return []

    avisos = _check_acronym_expansions(texto, current_metrics or {})

    if not objective_trends:
        return avisos

    sentencas = [s.strip() for s in re.split(r"(?<=[.!?])\s+", texto) if s.strip()]

    for key, tendencia in objective_trends.items():
        if _raw_direction(key, tendencia) is not None:
            avisos.extend(_find_trend_contradictions(key, tendencia, sentencas))

    return avisos


def _sentence_contradicts_trend(sentenca, tendencia, key=None):
    """Indica se a sentença descreve o sentido oposto à tendência real, sem
    também mencionar o sentido correto (texto ambíguo não gera aviso). O
    sentido clínico da métrica decide o que é coerente: EB subiu -> "piora"
    ou "aumentou" estão certos, "melhora" ou "caiu" contradizem."""
    sentido = _raw_direction(key, tendencia)
    if sentido is None:
        return False
    sentenca_lower = sentenca.lower()
    palavras_subida, palavras_descida = _keywords_for(key)
    tem_subida = any(kw in sentenca_lower for kw in palavras_subida)
    tem_descida = any(kw in sentenca_lower for kw in palavras_descida)
    if sentido == "up":
        return tem_descida and not tem_subida
    return tem_subida and not tem_descida


def _find_trend_contradictions(key, tendencia, sentencas):
    """Avisos para as sentenças que mencionam a métrica (pela sigla ou pelo
    nome por extenso) e contradizem a tendência esperada."""
    label, _ = METRIC_LABELS[key]
    padrao_mencao = re.compile(rf"\b{re.escape(key)}\b|{re.escape(label)}", re.IGNORECASE)
    return [
        {"metrica": key, "esperado": tendencia, "trechoSuspeito": sentenca}
        for sentenca in sentencas
        if padrao_mencao.search(sentenca) and _sentence_contradicts_trend(sentenca, tendencia, key)
    ]


def _build_dados_brutos(current_metrics, metric_sources, device=None):
    linhas = []
    for key, valor in current_metrics.items():
        if key not in METRIC_LABELS or valor is None:
            continue
        label, _ = METRIC_LABELS[key]
        linhas.append({
            "metrica": label,
            "sigla": key,
            "valor": valor,
            "unidade": _metric_unit(key, device),
            "sourceCollection": metric_sources.get(key, "—"),
        })
    return linhas


def generate(payload: dict) -> dict:
    """Gera o relatório narrativo a partir das métricas já extraídas do MongoDB.

    `payload` segue o formato montado pela Azure Function GenerateClinicalReport:
    device, period, sessionCount, isFirstReport, currentMetrics, initialMetrics,
    metricSources, missingOptionalFields, patientContext, alerts.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if api_key:
        return _generate_via_llm(payload, api_key)
    return _build_template_report(payload)


def _build_template_report(payload: dict) -> dict:
    """Relatório pelo template determinístico — usado sem chave de LLM e como
    fallback quando a chamada ao LLM falha."""
    device = payload.get("device", "Pitaco")
    period = payload.get("period") or {}
    session_count = payload.get("sessionCount", 0)
    is_first_report = payload.get("isFirstReport", False)
    # EB (Escala de Borg) é sempre inteiro de 0-10 — arredonda logo na entrada
    # pra que todo texto/tabela sintetizado a partir daqui já saia consistente
    # (pedido no piloto com o professor).
    current_metrics = _round_borg(payload.get("currentMetrics") or {})
    initial_metrics = None if is_first_report else _round_borg(payload.get("initialMetrics"))
    metric_sources = payload.get("metricSources") or {}

    resumo = _build_resumo(device, period, session_count, current_metrics)
    # RF09: alertas disparados até o fim do período entram no texto.
    alertas = _build_alertas(payload.get("alerts"))
    if alertas:
        resumo = f"{resumo} {alertas}"
    # RN06: no primeiro relatório não há comparação.
    evolucao = TEXTO_AVALIACAO_INICIAL if is_first_report else _build_evolucao(current_metrics, initial_metrics)

    return {
        "resumoSessao": resumo,
        "evolucao": evolucao,
        "avisoRevisao": AVISO_REVISAO,
        "dadosBrutos": _build_dados_brutos(current_metrics, metric_sources, device),
        "generatedBy": "template",
        # Texto do template é derivado diretamente das métricas, não há o que
        # confrontar — sempre coerente por construção.
        "coerenciaVerificada": True,
        "avisosCoerencia": [],
        # FA02 — campos opcionais que não puderam ser consultados no período.
        "missingOptionalFields": payload.get("missingOptionalFields", []),
    }


def _strip_markdown_fence(text: str) -> str:
    """Remove o bloco markdown (```json ... ```) que alguns modelos colocam em
    volta do JSON. Feito com operações de string em vez de regex: a regex
    anterior tinha backtracking super-linear e precedência ambígua (Sonar)."""
    text = text.strip()
    if not text.startswith("```"):
        return text
    text = text[3:]
    if text[:4].lower() == "json":
        text = text[4:]
    text = text.strip()
    if text.endswith("```"):
        text = text[:-3].rstrip()
    return text


def _generate_via_llm(payload: dict, api_key: str) -> dict:
    """Chamada real ao LLM via Groq (API compatível com OpenAI).
    Usada automaticamente quando GROQ_API_KEY está configurada no ambiente."""
    from openai import OpenAI

    model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
    client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")

    device = payload.get("device", "Pitaco")
    period = payload.get("period") or {}
    session_count = payload.get("sessionCount", 0)
    is_first_report = payload.get("isFirstReport", False)
    # EB (Escala de Borg) é sempre inteiro de 0-10 — ver nota em `_build_template_report()`.
    current_metrics = _round_borg(payload.get("currentMetrics") or {})
    initial_metrics = None if is_first_report else _round_borg(payload.get("initialMetrics"))
    patient_context = payload.get("patientContext") or {}
    metric_sources = payload.get("metricSources") or {}
    alerts = payload.get("alerts") or []
    alertas_txt = "\n".join(f"- {describe_alert(a)}" for a in alerts) if alerts else "nenhum"

    prompt = f"""Você é um assistente clínico que auxilia fisioterapeutas respiratórios a
interpretar dados do exergame I Blue It. Gere um relatório clínico narrativo em português,
objetivo e profissional, com base nestes dados:

Dispositivo: {device}
Período: {_format_date(period.get('start'))} a {_format_date(period.get('end'))}
Sessões realizadas no período: {session_count}
Contexto do paciente: {patient_context}
Primeiro relatório do paciente neste dispositivo (avaliação inicial): {"sim" if is_first_report else "não"}

Métricas do período atual (sigla, nome completo, unidade e valor):
{_format_metrics_for_prompt(current_metrics, device)}

Métricas da avaliação inicial do paciente (mesmo formato, ou "—" se não houver):
{_format_metrics_for_prompt(initial_metrics, device) if initial_metrics else "—"}

Alertas clínicos disparados até o fim do período (critérios configurados pelo fisioterapeuta):
{alertas_txt}

Use sempre o nome completo de cada métrica entre parênteses na primeira menção
(ex: "EB (Escala de Borg)"), exatamente como informado acima — não invente ou
deduza o significado de nenhuma sigla. EB (Escala de Borg) é sempre um número
inteiro de 0 a 10 — nunca escreva um valor com casas decimais para ela.
Na EB (Escala de Borg, esforço percebido) um valor MAIOR indica PIORA; nas demais
métricas de desempenho (DJ, PJ, CGc, PEmax, PImax) um valor maior indica melhora.
FR, PEmax, PImax, TEmax e TImax são capacidades registradas na calibração do
dispositivo, não medidas observadas nas sessões do período.
Se houver alertas listados acima, mencione cada um no resumoSessao; não invente
alertas que não estejam na lista.

Responda em JSON com as chaves: resumoSessao (2-3 parágrafos), evolucao
(comparação do estado atual com a avaliação inicial do paciente, cobrindo as
variáveis DJ, PJ, CGc, FR, PEmax, PImax e EB; ou null se este for o primeiro
relatório do paciente)."""

    def _fallback_template():
        # Groq indisponível, resposta não-JSON, ou qualquer outra falha na
        # chamada ao LLM — cai pro template determinístico em vez de estourar
        # erro genérico lá no Node (modelos gratuitos/menores são instáveis).
        return _build_template_report(payload)

    import json as _json
    try:
        response = client.chat.completions.create(
            model=model,
            max_tokens=1024,
            # temperature 0: a mesma entrada gera (praticamente) o mesmo texto,
            # o que torna o relatório replicável e auditável.
            temperature=0,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = response.choices[0].message.content.strip()
        # Alguns modelos embrulham a resposta em um bloco markdown (```json ... ```)
        # mesmo quando instruídos a responder só em JSON — remove o fence antes de parsear.
        response_text = _strip_markdown_fence(response_text)
        parsed = _json.loads(response_text)
    except Exception as exc:
        # Sem log, uma chave inválida ou o Groq fora do ar passavam
        # despercebidos (todo relatório saía do template sem ninguém saber).
        # Só o tipo e a mensagem — e a chave é mascarada caso apareça nela.
        mensagem = str(exc).replace(api_key, "***") if api_key else str(exc)
        logger.warning(
            "Falha na geração via LLM (%s: %s) — usando o template determinístico.",
            type(exc).__name__,
            mensagem,
        )
        return _fallback_template()

    def _coerce_text(value):
        # Modelos pequenos às vezes devolvem um objeto/lista em vez de texto
        # puro nessas chaves, mesmo instruídos a responder em string — sem
        # isso quebraria a checagem de coerência e a renderização no front.
        if value is None or isinstance(value, str):
            return value
        return _json.dumps(value, ensure_ascii=False)

    def _get_first(d, keys):
        # Modelo às vezes usa uma chave parecida mas não exatamente a pedida.
        for key in keys:
            value = d.get(key)
            if value:
                return value
        return None

    resumo_llm = _coerce_text(_get_first(parsed, ["resumoSessao", "resumo_sessao", "resumo", "summary"]))
    evolucao_llm = _coerce_text(
        _get_first(parsed, ["evolucao", "evolução", "analiseComparativa", "analise_comparativa", "comparativeAnalysis"])
    )

    if not resumo_llm:
        # JSON válido, mas sem o conteúdo esperado (ex: chaves erradas, campos
        # vazios) — trata como falha e cai pro template em vez de salvar um
        # relatório sem resumo nenhum.
        logger.warning("Resposta do LLM sem resumoSessao — usando o template determinístico.")
        return _fallback_template()

    if is_first_report:
        # RN06: no primeiro relatório não há com o que comparar — usa sempre o
        # mesmo texto do template em vez de confiar no que o modelo escreveu
        # (ele podia devolver null ou inventar uma "evolução").
        evolucao_llm = TEXTO_AVALIACAO_INICIAL

    # RF05/FA03 — mitigação do risco de alucinação: confronta o texto gerado
    # com a tendência real das métricas antes de exibir (ver review do PR).
    objective_trends = _objective_trends(current_metrics, initial_metrics)
    avisos_coerencia = _check_coherence(resumo_llm, evolucao_llm, objective_trends, current_metrics)

    return {
        "resumoSessao": resumo_llm,
        "evolucao": evolucao_llm,
        "avisoRevisao": AVISO_REVISAO,
        "dadosBrutos": _build_dados_brutos(current_metrics, metric_sources, device),
        "generatedBy": "llm",
        "coerenciaVerificada": len(avisos_coerencia) == 0,
        "avisosCoerencia": avisos_coerencia,
        "missingOptionalFields": payload.get("missingOptionalFields", []),
    }
