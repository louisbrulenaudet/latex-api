# Use the official Bun image
# See all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.3 AS base
WORKDIR /usr/src/app

# Install dependencies into temp directory (cached for future builds)
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Copy node_modules from temp, then copy project files
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
RUN bun run check-types && bun run check

# Production image: production deps + source + TeX Live (pdflatex)
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/src ./src
COPY --from=prerelease /usr/src/app/package.json .
COPY --from=prerelease /usr/src/app/tsconfig.json .

# Install TeX Live for pdflatex, xelatex (fontspec) + curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
  texlive-latex-base \
  texlive-latex-recommended \
  texlive-latex-extra \
  texlive-xetex \
  texlive-lang-french \
  texlive-fonts-recommended \
  texlive-fonts-extra \
  fontconfig \
  curl \
  && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* \
  && fc-cache -fv

# Writable TeX/font cache for non-root bun user (avoids "Corrupted NFSS tables" in production)
ENV HOME=/tmp
ENV TEXMFVAR=/tmp/texmf-var

USER bun
EXPOSE 3000/tcp
ENTRYPOINT ["bun", "run", "src/index.ts"]
