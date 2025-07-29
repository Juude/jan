# Cortex Extension

This document explains how the Cortex extension works and how the binary is created.

## Overview

The Cortex extension is responsible for running inference. It communicates with the Cortex API to load and unload models, and to make inference requests. The Cortex API is a local service that runs on the user's machine.

## How it Works

The Cortex extension is a `LocalOAIEngine` that communicates with the Cortex API. The extension starts the Cortex server and then communicates with it through a REST API. The extension also subscribes to events from the Cortex API and handles new message requests.

## Binary Creation

The Cortex extension binary is not compiled from source in this repository. Instead, the binary is downloaded from GitHub releases. The `download.sh` script in the `extensions/inference-cortex-extension` directory downloads the Cortex server and the Cortex engines from the `cortex.cpp` and `cortex.llamacpp` repositories.

The script detects the operating system and downloads the appropriate binaries. The binaries are then extracted to the `bin` and `electron/shared/engines` directories.

## Code Reference

-   `extensions/inference-cortex-extension/download.sh`: The script that downloads the Cortex server and engines.
-   `extensions/inference-cortex-extension/src/index.ts`: The main file for the Cortex extension.
-   `extensions/inference-cortex-extension/src/node/index.ts`: The file that contains the logic for starting the Cortex server.
