# I Blue It — Report AI

Serviço Python (FastAPI) responsável por gerar o texto narrativo do relatório
clínico a partir das métricas já extraídas do MongoDB pela Azure Function
`GenerateClinicalReport` (repositório `iblueit-server-side`). Corresponde ao
componente `URL_API_IA` descrito no RFC.

## Rodando localmente

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Endpoint principal: `POST http://localhost:8000/generate-report`

## Geração de texto: template vs. LLM

O texto narrativo pode ser gerado de dois jeitos, com o mesmo formato de
resposta (nenhuma outra parte do sistema precisa mudar):

- **LLM via Groq** (API compatível com OpenAI) — usado quando existe uma
  chave de API disponível. Modelo configurável por `GROQ_MODEL`
  (padrão `openai/gpt-oss-20b`).
- **Template determinístico** (sem custo, sem chave de API) — usado quando
  não há chave nenhuma, ou como fallback se a chamada ao LLM falhar ou
  devolver uma resposta inválida. Suficiente para desenvolver e testar o
  fluxo ponta a ponta.

### De onde vem a chave

Ordem de prioridade em `POST /generate-report`:

1. **Chave própria do fisioterapeuta** — header `X-LLM-Api-Key`, repassado
   pela Azure Function `GenerateClinicalReport`. Cada profissional cadastra a
   sua no front (*menu da conta → Chave de IA*); ela fica guardada
   criptografada no `UserAccount` (AES-256-GCM, ver
   `shared/llmKeyCrypto.js`) e só é descriptografada no momento de gerar o
   relatório. Vai no header, e não no corpo, para não aparecer em log de payload.
2. **Chave padrão do servidor** — variável de ambiente `GROQ_API_KEY`.
3. **Nenhuma chave** — template determinístico.

```bash
export GROQ_API_KEY=gsk_...          # opcional: chave padrão do servidor
export GROQ_MODEL=openai/gpt-oss-20b # opcional
```

Este serviço não guarda chave nenhuma: a de cada fisioterapeuta chega a cada
requisição e é usada só naquela chamada.
