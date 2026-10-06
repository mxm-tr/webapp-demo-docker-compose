FROM hugomods/hugo:exts

WORKDIR /src

# Copy Hugo site
COPY . .

# Build the site, including draft content
RUN hugo --minify --buildDrafts

# Serve the generated site
EXPOSE 8080

CMD ["hugo", "server", "--buildDrafts", "--bind", "0.0.0.0", "--port", "8080"]