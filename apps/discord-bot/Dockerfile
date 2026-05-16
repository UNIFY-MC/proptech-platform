FROM denoland/deno:alpine-1.41.3

WORKDIR /app

COPY src ./src

# Cache deps (none external for now, but futureproof)
RUN deno cache --no-check src/bot.ts || true

EXPOSE 8080

CMD ["deno", "run", "--allow-net", "--allow-env", "src/bot.ts"]
