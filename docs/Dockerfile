FROM hugomods/hugo:exts

WORKDIR /src

COPY . .

RUN hugo --minify

EXPOSE 8080

CMD ["hugo", "server", "--buildDrafts", "--bind", "0.0.0.0", "--port", "8080"]