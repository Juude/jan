# Cortex

Cortex is a local service that the application communicates with to perform various tasks, such as downloading models, managing inference engines, and running inference.

## Overview

Cortex is a separate process that runs on the user's machine. The application communicates with Cortex through a REST API. The application starts a Fastify server that acts as a proxy to the Cortex API. The server forwards requests to the Cortex API, which is running on `http://127.0.0.1:39291` by default.

## Responsibilities

Cortex is responsible for the following tasks:

-   **Model Management**: Downloading, deleting, and managing machine learning models.
-   **Inference Engine Management**: Starting, stopping, and managing inference engines.
-   **Inference**: Running inference on the models.

## Code Reference

-   `server/index.ts`: The Fastify server that acts as a proxy to the Cortex API.
-   `extensions/model-extension/src/index.ts`: The model extension that communicates with the Cortex API to manage models.
-   `extensions/inference-cortex-extension/src/index.ts`: The inference extension that communicates with the Cortex API to run inference.
