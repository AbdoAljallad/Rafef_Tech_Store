FROM python:3.11-slim

WORKDIR /app

ENV PIP_EXTRA_INDEX_URL=https://download.pytorch.org/whl/cpu

COPY backend/translation-local/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir --no-deps argostranslate==1.11.0

COPY backend/translation-local/server.py ./server.py

EXPOSE 5000

CMD ["python", "/app/server.py"]
