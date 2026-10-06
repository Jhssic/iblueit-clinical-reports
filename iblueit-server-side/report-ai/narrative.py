"""
Geração de texto narrativo clínico.

Hoje usa um template determinístico (sem custo, sem chave de API) para que o
fluxo ponta-a-ponta funcione sem depender de uma chave de LLM. Quando houver
uma chave configurada (GROQ_API_KEY), a função `generate` troca
automaticamente para a chamada real ao modelo via Groq, mantendo o
mesmo formato de resposta — nenhuma outra camada do sistema precisa mudar.
"""

import os
import re
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

AVISO_REVISAO = (
    "Este relatório foi gerado automaticamente por IA e deve ser revisado "
    "pelo profissional responsável antes de ser incorporado ao prontuário clínico."
)

METRIC_LABELS = {
    "DJ": ("Desempenho do Jogador", "índice 0–1"),
    "PJ": ("Pontos da Jogada", "pontos"),
    "CGc": ("Carga Corrente", "cmH2O"),
    "FR": ("Frequência Respiratória", "rpm"),
    "PEmax": ("Pressão Expiratória Máxima", "cmH2O"),
    "PImax": ("Pressão Inspiratória Máxima", "cmH2O"),
    "TEmax": ("Tempo Expiratório Máximo", "s"),
    "TImax": ("Tempo Inspiratório Máximo", "s"),
    "SpO2min": ("Saturação de Oxigênio Mínima", "%"),
    "FLi": ("Fluxo Inspiratório", "L/min"),
    "FLe": ("Fluxo Expiratório", "L/min"),
    "EB": ("Escala de Borg", "0–10"),
}


def _pct_change(current, previous):
    if previous is None or previous == 0:
        return None
    return round(((current - previous) / previous) * 100, 1)


def _trend_word(diff):
    if diff is None:
        return None
    if diff > 0:
        return "melhora"
    if diff < 0:
        return "redução"
    return "estabilidade"


def _format_date(iso_str):
    if not iso_str:
        return "—"
    try:
        return datetime.fromisoformat(iso_str.replace("Z", "+00:00")).strftime("%d/%m/%Y")
    except ValueError:
        return iso_str


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
        partes.append(f"A frequência respiratória (FR) média observada foi de {fr:.0f} rpm.")
    if eb is not None:
        partes.append(f"A Escala de Borg (esforço percebido) média foi de {eb:.1f}.")

    return " ".join(partes)


def _build_analise_comparativa(current_metrics, previous_metrics):
    if not previous_metrics:
        return None

    frases = []
    for key in ("DJ", "PJ", "CGc", "FR", "EB"):
        cur = current_metrics.get(key)
        prev = previous_metrics.get(key)
        if cur is None or prev is None:
            continue
        diff = _pct_change(cur, prev)
        if diff is None:
            continue
        label, _ = METRIC_LABELS[key]
        tendencia = _trend_word(diff)
        if tendencia == "estabilidade":
            frases.append(f"{label} ({key}) manteve-se estável em relação ao período anterior.")
        else:
            frases.append(
                f"{label} ({key}) apresentou {tendencia} de {abs(diff)}% em relação ao "
                f"período anterior (de {prev:.2f} para {cur:.2f})."
            )

    if not frases:
        return None
    return " ".join(frases)


def _objective_trends(current_metrics, previous_metrics):
    """Tendência esperada por métrica (melhora/redução/estabilidade), calculada
    diretamente dos números — usada como referência objetiva para checar se o
    texto gerado pelo LLM não contradiz os dados (ver `_check_coherence`)."""
    if not previous_metrics:
        return {}
    trends = {}
    for key in ("DJ", "PJ", "CGc", "FR", "EB"):
        cur = current_metrics.get(key)
        prev = previous_metrics.get(key)
        if cur is None or prev is None:
            continue
        diff = _pct_change(cur, prev)
        if diff is None:
            continue
        trends[key] = _trend_word(diff)
    return trends


_MELHORA_KEYWORDS = ("melhora", "melhorou", "aument", "subiu", "evolu", "progrediu", "elevaç")
_REDUCAO_KEYWORDS = ("reduç", "reduziu", "queda", "caiu", "piora", "piorou", "diminui", "declín")


def _check_coherence(resumo, analise, objective_trends):
    """Confronta o texto narrativo gerado pelo LLM com a tendência real das
    métricas (RF05/FA03 — mitigação do risco de alucinação levantado na review
    do PR). Só sinaliza contradições diretas (melhora vs. redução); tendências
    de estabilidade não geram aviso por serem mais ambíguas no texto livre.
    """
    texto = " ".join(t for t in (resumo, analise) if t)
    if not texto or not objective_trends:
        return []

    sentencas = [s.strip() for s in re.split(r"(?<=[.!?])\s+", texto) if s.strip()]
    avisos = []

    for key, tendencia in objective_trends.items():
        if tendencia not in ("melhora", "redução"):
            continue
        label, _ = METRIC_LABELS[key]
        padrao_mencao = re.compile(rf"\b{re.escape(key)}\b|{re.escape(label)}", re.IGNORECASE)

        for sentenca in sentencas:
            if not padrao_mencao.search(sentenca):
                continue
            sentenca_lower = sentenca.lower()
            tem_melhora = any(kw in sentenca_lower for kw in _MELHORA_KEYWORDS)
            tem_reducao = any(kw in sentenca_lower for kw in _REDUCAO_KEYWORDS)

            contradiz = (tendencia == "melhora" and tem_reducao and not tem_melhora) or (
                tendencia == "redução" and tem_melhora and not tem_reducao
            )
            if contradiz:
                avisos.append({
                    "metrica": key,
                    "esperado": tendencia,
                    "trechoSuspeito": sentenca,
                })

    return avisos


def _build_dados_brutos(current_metrics, metric_sources):
    linhas = []
    for key, valor in current_metrics.items():
        if key not in METRIC_LABELS or valor is None:
            continue
        label, unidade = METRIC_LABELS[key]
        linhas.append({
            "metrica": label,
            "sigla": key,
            "valor": valor,
            "unidade": unidade,
            "sourceCollection": metric_sources.get(key, "—"),
        })
    return linhas


def generate(payload: dict) -> dict:
    """Gera o relatório narrativo a partir das métricas já extraídas do MongoDB.

    `payload` segue o formato montado pela Azure Function GenerateClinicalReport:
    device, period, sessionCount, isFirstReport, currentMetrics, previousMetrics,
    metricSources, patientContext, alerts.
    """
    device = payload.get("device", "Pitaco")
    period = payload.get("period", {})
    session_count = payload.get("sessionCount", 0)
    is_first_report = payload.get("isFirstReport", False)
    current_metrics = payload.get("currentMetrics", {})
    previous_metrics = None if is_first_report else payload.get("previousMetrics")
    metric_sources = payload.get("metricSources", {})

    api_key = os.environ.get("GROQ_API_KEY")
    if api_key:
        return _generate_via_llm(payload, api_key)

    resumo = _build_resumo(device, period, session_count, current_metrics)
    analise = _build_analise_comparativa(current_metrics, previous_metrics)
    if is_first_report:
        analise = (
            "Esta é a sessão de referência inicial do paciente — ainda não há "
            "período anterior para comparação."
        )

    return {
        "resumoSessao": resumo,
        "analiseComparativa": analise,
        "avisoRevisao": AVISO_REVISAO,
        "dadosBrutos": _build_dados_brutos(current_metrics, metric_sources),
        "generatedBy": "template",
        # Texto do template é derivado diretamente das métricas, não há o que
        # confrontar — sempre coerente por construção.
        "coerenciaVerificada": True,
        "avisosCoerencia": [],
        # FA02 — campos opcionais que não puderam ser consultados no período.
        "missingOptionalFields": payload.get("missingOptionalFields", []),
    }


def _generate_via_llm(payload: dict, api_key: str) -> dict:
    """Chamada real ao LLM via Groq (API compatível com OpenAI).
    Usada automaticamente quando GROQ_API_KEY está configurada no ambiente."""
    from openai import OpenAI

    model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
    client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")

    device = payload.get("device", "Pitaco")
    period = payload.get("period", {})
    is_first_report = payload.get("isFirstReport", False)
    current_metrics = payload.get("currentMetrics", {})
    previous_metrics = payload.get("previousMetrics")
    patient_context = payload.get("patientContext", {})
    metric_sources = payload.get("metricSources", {})

    prompt = f"""Você é um assistente clínico que auxilia fisioterapeutas respiratórios a
interpretar dados do exergame I Blue It. Gere um relatório clínico narrativo em português,
objetivo e profissional, com base nestes dados:

Dispositivo: {device}
Período: {period.get('start', '—')} a {period.get('end', '—')}
Contexto do paciente: {patient_context}
Primeira sessão do paciente: {is_first_report}
Métricas do período atual: {current_metrics}
Métricas do período anterior: {previous_metrics}

Responda em JSON com as chaves: resumoSessao (2-3 parágrafos), analiseComparativa
(comparação com o período anterior, ou null se for a primeira sessão)."""

    def _fallback_template():
        # Groq indisponível, resposta não-JSON, ou qualquer outra falha na
        # chamada ao LLM — cai pro template determinístico em vez de estourar
        # erro genérico lá no Node (modelos gratuitos/menores são instáveis).
        session_count = payload.get("sessionCount", 0)
        resumo = _build_resumo(device, period, session_count, current_metrics)
        analise = _build_analise_comparativa(current_metrics, previous_metrics)
        if is_first_report:
            analise = (
                "Esta é a sessão de referência inicial do paciente — ainda não há "
                "período anterior para comparação."
            )
        return {
            "resumoSessao": resumo,
            "analiseComparativa": analise,
            "avisoRevisao": AVISO_REVISAO,
            "dadosBrutos": _build_dados_brutos(current_metrics, metric_sources),
            "generatedBy": "template",
            "coerenciaVerificada": True,
            "avisosCoerencia": [],
            "missingOptionalFields": payload.get("missingOptionalFields", []),
        }

    import json as _json
    try:
        response = client.chat.completions.create(
            model=model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = response.choices[0].message.content.strip()
        # Alguns modelos embrulham a resposta em um bloco markdown (```json ... ```)
        # mesmo quando instruídos a responder só em JSON — remove o fence antes de parsear.
        if response_text.startswith("```"):
            response_text = re.sub(r"^```(?:json)?\s*|\s*```$", "", response_text, flags=re.IGNORECASE)
        parsed = _json.loads(response_text)
    except Exception:
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
    analise_llm = _coerce_text(
        _get_first(parsed, ["analiseComparativa", "analise_comparativa", "analise", "comparativeAnalysis"])
    )

    if not resumo_llm:
        # JSON válido, mas sem o conteúdo esperado (ex: chaves erradas, campos
        # vazios) — trata como falha e cai pro template em vez de salvar um
        # relatório sem resumo nenhum.
        return _fallback_template()

    # RF05/FA03 — mitigação do risco de alucinação: confronta o texto gerado
    # com a tendência real das métricas antes de exibir (ver review do PR).
    objective_trends = _objective_trends(current_metrics, previous_metrics)
    avisos_coerencia = _check_coherence(resumo_llm, analise_llm, objective_trends)

    return {
        "resumoSessao": resumo_llm,
        "analiseComparativa": analise_llm,
        "avisoRevisao": AVISO_REVISAO,
        "dadosBrutos": _build_dados_brutos(current_metrics, metric_sources),
        "generatedBy": "llm",
        "coerenciaVerificada": len(avisos_coerencia) == 0,
        "avisosCoerencia": avisos_coerencia,
        "missingOptionalFields": payload.get("missingOptionalFields", []),
    }
