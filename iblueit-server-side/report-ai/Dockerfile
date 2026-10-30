FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --only-binary=:all: --require-hashes -r requirements.txt

# Copia só os módulos de verdade (não "COPY . ."), pra não arriscar incluir
# nada sensível/desnecessário do contexto de build — lembrar de adicionar
# aqui qualquer novo arquivo .py que a aplicação passe a precisar.
COPY main.py narrative.py anomaly_detection.py ./

RUN useradd --no-create-home --uid 1000 appuser
USER appuser

EXPOSE 8000

# PORT é injetado pelo Azure Container Apps; 8000 é o padrão local.
ENV PORT=8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
