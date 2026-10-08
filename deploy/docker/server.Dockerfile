FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH=/app
WORKDIR /app
COPY server /app/server

ARG SERVICE=orchestrator
ENV SERVICE=${SERVICE}
CMD ["sh", "-c", "python server/${SERVICE}/app.py"]
