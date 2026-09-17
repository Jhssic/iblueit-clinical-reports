# I Blue It 5.0 — Setup do ambiente local

> ⚠️ **Não commitar este arquivo** dentro de nenhum dos repositórios se você preencher as credenciais reais abaixo. Ele fica de propósito na pasta `~/Jhess/iblueit/` (fora dos `.git`) para não ser versionado.

Este projeto tem **dois repositórios web** (front-end e back-end) + **um serviço Python de IA** (dentro do back-end, pasta `report-ai/`) + **um projeto Unity** (o jogo, que gera os logs). Este guia cobre a inicialização dos três componentes web/Python. O Unity é instalado separadamente (seção final) e só é necessário pra gerar logs reais jogando.

- `iblueit-server-side` — back-end (Azure Functions / Node.js / MongoDB)
- `iblueit-server-side/report-ai` — serviço de IA (Python / FastAPI), gera o texto narrativo do relatório clínico
- `iblueit-health-Infocharts` — front-end (React)

---

## 1. Pré-requisitos (instalar uma vez)

### nvm + Node 12.16.1

O back-end usa dependências antigas (`mongoose` 5.9.2) que **não funcionam corretamente em versões modernas do Node** (bug de parsing da connection string do Mongo em Node 18+). É obrigatório rodar o back-end com Node 12.

```bash
nvm install 12.16.1
```

O front-end funciona normalmente em qualquer versão recente do Node (a que já estiver instalada/default no seu sistema).

### Azure Functions Core Tools v3 (para o Node 12)

Cada versão do Node gerenciada pelo `nvm` tem seus próprios pacotes globais. Instale o Core Tools **com o Node 12 ativo**:

```bash
nvm use 12.16.1
npm install -g azure-functions-core-tools@3 --unsafe-perm true
```

### libssl1.1 (necessário em Ubuntu 22.04+/24.04+)

O `func` v3 é baseado num runtime .NET antigo que depende do `libssl1.1`, removido dos repositórios padrão em versões recentes do Ubuntu.

```bash
wget -P /tmp http://security.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb
sudo dpkg -i /tmp/libssl1.1_1.1.1f-1ubuntu2_amd64.deb
```

### IPv6 quebrado para CDNs da Microsoft (comum em redes de faculdade/provedores)

Se o `func host start` ficar travado pra sempre logo após imprimir a versão (sem erro, sem prosseguir), é porque o `.NET` tenta IPv6 pra falar com `functionscdn.azureedge.net` e sua rede não entrega IPv6 pra esse destino, travando o handshake. Corrige de vez, pro sistema todo, fazendo-o preferir IPv4:

```bash
echo 'precedence ::ffff:0:0/96  100' | sudo tee -a /etc/gai.conf
```

### Variáveis de ambiente permanentes (recomendado)

```bash
echo 'export DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1' >> ~/.bashrc
echo 'export OPENSSL_CONF=/dev/null' >> ~/.bashrc
echo 'export FUNCTIONS_CORE_TOOLS_TELEMETRY_OPTOUT=1' >> ~/.bashrc
source ~/.bashrc
```

- `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1` — evita erro `Couldn't find a valid ICU package`.
- `OPENSSL_CONF=/dev/null` — evita erro `The SSL connection could not be established` (o `libssl1.1` não entende o `openssl.cnf` do OpenSSL 3.x do sistema).
- `FUNCTIONS_CORE_TOOLS_TELEMETRY_OPTOUT=1` — desliga telemetria (reduz chamadas de rede desnecessárias no startup).

### Python 3

Já vem instalado no Ubuntu. Necessário pro serviço `report-ai`.

---

## 2. Back-end (`iblueit-server-side`)

### 2.1 Instalar dependências

```bash
cd iblueit-server-side
nvm use 12.16.1
npm install
```

### 2.2 Configurar `local.settings.json`

Não existe por padrão (está no `.gitignore`). Copiar do template:

```bash
cp local.settings.template.json local.settings.json
```

Editar:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "MongoDbAtlas": "mongodb+srv://iblueit:<SENHA>@cluster-iblueit-v5.macmgc7.mongodb.net/IBLUEIT?retryWrites=true&w=majority",
    "URL_API_IA": "http://localhost:8000"
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

⚠️ **Nome do banco na URL** (`/IBLUEIT`, maiúsculo) — nomes de banco no MongoDB são case-sensitive. O banco real do projeto v5.0 se chama `IBLUEIT`.

### 2.3 `host.json`

Sem `extensionBundle` — não é necessário porque todas as functions usam só HTTP trigger (não precisam de nenhum binding extra baixado da internet):

```json
{
  "version": "2.0"
}
```

### 2.4 Rodar o back-end

Use o script pronto (já configura tudo):

```bash
bash run-backend.sh
```

Equivalente manual, se o script não existir:
```bash
export DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
export OPENSSL_CONF=/dev/null
export FUNCTIONS_CORE_TOOLS_TELEMETRY_OPTOUT=1
nvm use 12.16.1
func host start --cors "*"
```

(as aspas em `"*"` são obrigatórias — sem elas o bash expande pra lista de arquivos da pasta, e o CORS quebra)

**Sinal de sucesso:** lista de rotas, `Core Tools Version: 3.0.5682`, termina com `Host lock lease acquired`. API em `http://localhost:7071/api`.

Pode ignorar o warning `The 'UpdateGameParameter' function is in error` — bug pré-existente de rota duplicada, não afeta o resto.

### 2.5 Testar

```bash
curl http://localhost:7071/api/pacients
```
Deve retornar 403 `"Chave de acesso inválida"` (esperado sem token — confirma API + Mongo ok).

### 2.6 Criar conta de teste (role Administrator)

```bash
curl -X POST http://localhost:7071/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": "Seu Nome",
    "username": "seu_usuario",
    "password": "SuaSenha123!",
    "email": "seu@email.com",
    "role": "Administrator"
  }'
```

### 2.7 Popular dados de teste

```bash
node seed-test-data.js          # cria 5 pacientes fictícios + sessões
node export-patient-data.js     # exporta os dados deles pra um .json local, útil pra validar
```

---

## 3. Serviço de IA (`iblueit-server-side/report-ai`)

```bash
cd iblueit-server-side/report-ai
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000
```

Testar: `curl http://localhost:8000/health` deve retornar `{"status":"ok"}`.

Por padrão gera o texto do relatório por **template** (sem custo, sem chave). Pra usar o Claude de verdade:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

---

## 4. Front-end (`iblueit-health-Infocharts`)

```bash
cd iblueit-health-Infocharts
npm install
npm start
```

Não precisa de `nvm use` nem `.env` — sem `.env`, aponta sozinho pra `http://localhost:7071/api`. Abre em `http://localhost:3000` (ou próxima porta livre).

Login: use a conta do passo 2.6.

---

## 5. Checklist rápido (3 terminais, depois de tudo instalado)

**Terminal 1** (back-end):
```bash
cd iblueit-server-side && bash run-backend.sh
```

**Terminal 2** (IA):
```bash
cd iblueit-server-side/report-ai && source venv/bin/activate && uvicorn main:app --port 8000
```

**Terminal 3** (front-end):
```bash
cd iblueit-health-Infocharts && npm start
```

---

## 6. Troubleshooting — erros já mapeados

| Erro | Causa | Solução |
|---|---|---|
| `Couldn't find a valid ICU package installed on the system` | Falta suporte a globalização no .NET | `export DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1` |
| `No usable version of libssl was found` | Falta `libssl1.1` no Ubuntu 22.04+/24.04+ | Instalar `.deb` do `libssl1.1` (seção 1) |
| `The SSL connection could not be established... error:0E076071` | `libssl1.1` não entende o `openssl.cnf` do OpenSSL 3.x do sistema | `export OPENSSL_CONF=/dev/null` |
| `func host start` trava pra sempre logo após imprimir a versão, sem erro | IPv6 quebrado na rede até `functionscdn.azureedge.net`; o .NET tenta IPv6 primeiro e nunca cai pro IPv4 | `echo 'precedence ::ffff:0:0/96 100' \| sudo tee -a /etc/gai.conf` |
| `Value cannot be null. (Parameter 'provider')` | Cache corrompido do extension bundle | Remover `host.json` → `extensionBundle` (seção 2.3) e/ou limpar `~/.azure-functions-core-tools/Functions/ExtensionBundles` |
| `Referenced bundle ... does not meet the required minimum version` | `host.json` com `extensionBundle` desatualizado | Removido de vez — não é necessário pra este projeto (só HTTP triggers) |
| `Incompatible Node.js version v25` + `Invalid port in url` ao conectar no Mongo | Driver antigo do MongoDB (`mongoose` 5.9.2) não interpreta a connection string em Node 18+ | Sempre `nvm use 12.16.1` antes do `func host start` |
| `MongoError: db already exists with different case` | Nome do banco com case errado na connection string | Usar `/IBLUEIT` (maiúsculo) |
| Front mostra "Impossível fazer conexão com o servidor", mas `curl` funciona | CORS: `--cors *` sem aspas é expandido pelo bash | Usar `--cors "*"` (com aspas) |
| `func` não encontrado depois de `nvm use` | Cada versão do Node no `nvm` tem seus próprios pacotes globais | Reinstalar `azure-functions-core-tools` com a versão ativa |
| Texto invisível em `Select`/`TableCell` no front | Tema global do MUI usa texto quase-branco (pra sidebar escura), invisível em cards brancos | Fixar `color: "#11192A"` explicitamente no componente |
| `Error: \`collection\` may not be used as a schema pathname` | `collection` é palavra reservada do Mongoose | Renomear o campo (ex: `sourceCollection`) |

---

## 7. Sobre o projeto Unity (jogo / gerador de logs)

Não faz parte destes repositórios. Necessário só se for preciso gerar sessões de jogo reais.

1. Instalar Unity Hub
2. Instalar Unity `2022.3.4f1`
3. Instalar package [Newtonsoft.Json-for-Unity](https://github.com/jilleJr/Newtonsoft.Json-for-Unity)
4. Instalar VS Code + extensões (C#, Debugger for Unity, Unity Tools, Unity Code Snippets) + .NET
   - Em Unity: `Edit → Preferences → External Tools` → selecionar VS Code, gerar `.csproj`
5. Instalar GitHub Desktop

**Para build de testes:** criar paciente `NetRunner` (convenção de teste). No `Patient.cs`, comentar o bloco `if UNITY_EDITOR`, e desativar `AuxilioTestes` em `SceneLoader`.

### Connection strings conhecidas (Mongo Atlas)

- v4.0: `mongodb+srv://bluedb:<SENHA>@cluster0test.94vvs.azure.mongodb.net/IBLUEIT?retryWrites=true&w=majority`
- v5.0 (atual): `mongodb+srv://iblueit:<SENHA>@cluster-iblueit-v5.macmgc7.mongodb.net/IBLUEIT?retryWrites=true&w=majority`
