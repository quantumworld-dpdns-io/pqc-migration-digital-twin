FROM python:3.12-slim
RUN groupadd -r appuser && useradd -r -g appuser -u 10014 appuser
WORKDIR /app
COPY hndl_analysis/ /app/hndl_analysis/
COPY qasm_workflows/ /app/qasm_workflows/
COPY service.py /app/service.py
COPY qasm_examples/ /app/qasm_examples/
RUN chown -R appuser:appuser /app
COPY start.sh /start.sh
RUN chmod +x /start.sh
ENV PYTHONUNBUFFERED=1
USER 10014
EXPOSE 8082 8084
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8082/health', timeout=3)" || exit 1
ENTRYPOINT ["/start.sh"]
