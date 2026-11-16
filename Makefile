# Forja: tareas de desarrollo. App estática, sin paso de compilación.
# Docs consultadas: makefile-generator/docs/patterns-guide.md (Pattern 8: Docker Integration).
# Compatible con GNU Make 3.81 (el de macOS): sin .ONESHELL ni .SHELLFLAGS.

SHELL := /bin/bash
.DELETE_ON_ERROR:
.SUFFIXES:
MAKEFLAGS += --no-builtin-rules
MAKEFLAGS += --warn-undefined-variables
# Sin argumentos, `make` muestra la ayuda en vez de ejecutar algo.
.DEFAULT_GOAL := help

PORT ?= 8765
DOCKER_PORT ?= 8080
IMAGE ?= forja:local

.PHONY: help test check ci serve docker-build docker-run docker-clean clean
# Los objetivos de Docker no deben correr en paralelo.
.NOTPARALLEL: docker-build docker-run docker-clean

## Muestra esta ayuda
help:
	@echo "Forja: tareas disponibles"
	@awk '/^## /{d=substr($$0,4); next} /^[a-z-]+:/{if(d){sub(/:.*/,"",$$1); printf "  %-14s %s\n",$$1,d}; d=""}' $(MAKEFILE_LIST)
	@echo "Variables: PORT=$(PORT) DOCKER_PORT=$(DOCKER_PORT) IMAGE=$(IMAGE)"

## Tests del motor y del coach
test:
	node test.js

## Verificaciones estáticas (sintaxis, manifest, archivos del service worker)
check:
	node scripts/check.js

## Todo lo que corre la integración continua
ci: test check

## Sirve la app en local (puerto PORT, 8765 por defecto)
serve:
	python3 -m http.server $(PORT) --bind 127.0.0.1

## Construye la imagen de Docker (nginx)
docker-build:
	docker build -t $(IMAGE) .

## Sirve la imagen en local (puerto DOCKER_PORT, 8080 por defecto)
docker-run: docker-build
	docker run --rm -p 127.0.0.1:$(DOCKER_PORT):8080 $(IMAGE)

## Borra la imagen local
docker-clean:
	docker rmi $(IMAGE) 2>/dev/null || true

## Borra artefactos locales (_site del despliegue)
clean:
	$(RM) -r _site
