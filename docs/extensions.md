# Extensions

This document explains how extensions work in this repository.

## Overview

Extensions are used to extend the functionality of the application. They can be used to add new features, such as support for new AI engines, or to modify existing features.

## Extension Structure

Each extension is a separate package located in the `extensions` directory. The `extensions` directory is a Yarn workspace, which means that each subdirectory is a separate package.

Each extension must have a `package.json` file and an entry point file (usually `src/index.ts`). The entry point file must export a default class that extends the `BaseExtension` class.

## Extension Lifecycle

The `ExtensionManager` class in `web/extension/ExtensionManager.ts` is responsible for managing the lifecycle of extensions. The lifecycle of an extension is as follows:

1.  **Installation**: The `install` method of the `ExtensionManager` is called to install a new extension from a given URL.
2.  **Registration**: The `register` method of the `ExtensionManager` is called to register the extension.
3.  **Activation**: The `activateExtension` method of the `ExtensionManager` is called to import the extension's code and create a new instance of the extension's class.
4.  **Loading**: The `load` method of the `ExtensionManager` is called to call the `onLoad` method of the extension.
5.  **Unloading**: The `unload` method of the `ExtensionManager` is called to call the `onUnload` method of the extension.
6.  **Uninstallation**: The `uninstall` method of the `ExtensionManager` is called to uninstall the extension.

## Extension Responsibilities

-   **`assistant-extension`**: Manages assistants. It creates a default assistant named "Jan" and provides methods for creating, getting, and deleting assistants. It also registers a retrieval tool that can be used by assistants.
-   **`conversational-extension`**: Manages conversations. It provides methods for creating, getting, and deleting threads and messages. It also provides methods for managing the assistant associated with a thread.
-   **`engine-management-extension`**: Manages inference engines. It provides methods for getting, installing, and uninstalling engines. It also provides methods for managing remote models.
-   **`hardware-management-extension`**: Manages hardware. It provides methods for getting hardware information and setting the active GPU.
-   **`inference-cortex-extension`**: Runs inference. It provides methods for loading and unloading models, and for making inference requests. It also subscribes to events from the Cortex API and handles new message requests.
-   **`model-extension`**: Manages models. It provides methods for downloading, deleting, and getting models. It also provides methods for managing model sources.

## Code Reference

-   `extensions`: The directory containing all the extensions.
-   `web/extension/ExtensionManager.ts`: The class responsible for managing extensions.
-   `core/src/browser/extension.ts`: The base class for extensions.
