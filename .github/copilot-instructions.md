# Copilot Instructions for webportaal_pagaaierTools

This file contains project-specific instructions for GitHub Copilot.

## Port Assignments

This project uses deterministically generated ports based on the project name.

| Service  | Port | Environment Variable |
|----------|------|---------------------|
| Frontend | 9343 | PORT_FRONTEND      |
| Backend  | 9344 | PORT_BACKEND       |
| API      | 9345 | PORT_API           |
| Docs     | 9346 | PORT_DOCS          |

**Main Application Port:** `9344` (PORT_BACKEND)

**Usage:**
- Frontend: `http://localhost:9343`
- Backend: `http://localhost:9344` (main application)
- API: `http://localhost:9345`
- Docs: `http://localhost:9346`

These ports are automatically generated to avoid conflicts and remain consistent across environments.

## Configuration

All configuration is managed through environment variables in `.env` file:
- Copy `.env.example` to `.env` 
- Update values as needed
- Never commit `.env` to version control
