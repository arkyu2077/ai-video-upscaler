#!/usr/bin/env bash
# Add the VideoUpscaler MCP server to Claude Code for all projects.
# Then run /mcp in Claude Code, select videoupscaler and choose Authenticate.
claude mcp add --transport http videoupscaler https://videoupscaler.co/api/mcp --scope user
