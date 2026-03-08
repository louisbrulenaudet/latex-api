include make/variables.mk

# Include specific command groups
include make/help.mk
include make/dev.mk
include make/husky.mk
include make/docker.mk

# Default target
.DEFAULT_GOAL := help

# Ensure these targets work even if files with the same names exist
.PHONY: help build test clean docker-build docker-up docker-down docker-restart docker-logs docker-logs-app docker-logs-tunnel docker-ps docker-clean docker-rebuild
