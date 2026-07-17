# ordek-target-wp — WPScan için WordPress benzeri hedef (hafif mock, bağımlılıksız).
# Gerçek WP+MySQL ağırdır; bu mock wpscan'in enumerate ettiği uçları (generator,
# readme, /wp-content/plugins/<vuln>/readme.txt, /wp-json users, ?author=N) sunar.
# Flag, zafiyetli eklentinin readme.txt'sinde.
FROM python:3.12-slim
WORKDIR /app
COPY server.py /app/server.py
ENV LAB_FLAG="ordek{lab}" LAB_SCENARIO="" PORT=80
EXPOSE 80
CMD ["python3", "server.py"]
