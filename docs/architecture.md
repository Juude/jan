# Architecture

This document explains the architecture of the project.

## Overview

The project is a desktop application that allows users to download and run machine learning models. The application is built with Electron and Next.js. It has a modular architecture that consists of a frontend, a backend, and a set of extensions.

## Frontend

The frontend is a Next.js application located in the `web` directory. It is responsible for rendering the user interface and communicating with the backend. The frontend is built with React, and it uses Jotai for state management.

The frontend is divided into the following directories:

-   `app`: This directory contains the pages of the application.
-   `components`: This directory contains reusable components.
-   `containers`: This directory contains components that are connected to the application's state.
-   `helpers`: This directory contains helper functions and atoms for Jotai.
-   `hooks`: This directory contains custom React hooks.
-   `screens`: This directory contains the main screens of the application.
-   `services`: This directory contains services that communicate with the backend.
-   `styles`: This directory contains the styles of the application.
-   `utils`: This directory contains utility functions.

## Backend

The backend consists of a Cortex service and a set of extensions.

### Cortex

Cortex is a local service that the application communicates with to perform various tasks, such as downloading models, managing inference engines, and running inference. Cortex is a separate process that runs on the user's machine. The application communicates with Cortex through a REST API.

### Extensions

Extensions are used to extend the functionality of the application. They can be used to add new features, such as support for new AI engines, or to modify existing features. Each extension is a separate package located in the `extensions` directory.

## Code Reference

-   `web`: The directory containing the frontend application.
-   `server`: The directory containing the Cortex service.
-   `extensions`: The directory containing all the extensions.
