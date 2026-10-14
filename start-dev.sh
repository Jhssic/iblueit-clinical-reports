#!/usr/bin/env bash
# Sobe os três serviços do projeto de uma vez: report-ai, Azure Function e React.
# Uso: ./start-dev.sh (a partir da raiz do repo, ou de qualquer lugar)
# Ctrl+C encerra os três.

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDS=()

cleanup() {
    echo ""
    echo "Encerrando serviços..."
    kill "${PIDS[@]}" 2>/dev/null
    sleep 1
    # func e uvicorn (--reload) soltam processos filhos que não morrem junto
    # com o pai (worker do func, reloader/multiprocessing do uvicorn) — mata
    # esses também, senão ficam presos na porta na próxima vez que subir.
    pkill -9 -f "azure-functions-core-tools/bin/workers/node/dist/src/nodejsWorker.js" 2>/dev/null
    pkill -9 -f "iblueit-server-side/report-ai/venv/bin/python3 -c from multiprocessing" 2>/dev/null
    kill -9 "${PIDS[@]}" 2>/dev/null
}
trap cleanup EXIT INT TERM

echo "Subindo report-ai (porta 8001)..."
if [ ! -f "$ROOT_DIR/iblueit-server-side/report-ai/venv/bin/activate" ]; then
    echo "ERRO: venv não encontrado em iblueit-server-side/report-ai/venv (ele é local, não vai pro git)."
    echo "Rode primeiro: cd iblueit-server-side/report-ai && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi
(
    cd "$ROOT_DIR/iblueit-server-side/report-ai" || exit 1
    source venv/bin/activate
    exec uvicorn main:app --reload --port 8001
) > /tmp/report-ai.log 2>&1 &
PIDS+=($!)

echo "Subindo Azure Function (porta 7071)..."
(
    cd "$ROOT_DIR/iblueit-server-side" || exit 1
    exec func start --cors "*"
) > /tmp/func.log 2>&1 &
PIDS+=($!)

echo "Subindo React (porta 3000)..."
(
    cd "$ROOT_DIR/iblueit-health-Infocharts" || exit 1
    exec npm start
) > /tmp/react.log 2>&1 &
PIDS+=($!)

echo ""
echo "Serviços no ar:"
echo "  React:      http://localhost:3000/iblueit-health-Infocharts"
echo "  Function:   http://localhost:7071"
echo "  report-ai:  http://localhost:8001"
echo ""
echo "Logs: /tmp/react.log  /tmp/func.log  /tmp/report-ai.log"
echo "Pressione Ctrl+C pra parar os três."
echo ""

wait
