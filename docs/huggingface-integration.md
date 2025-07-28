# Hugging Face Integration

This document explains how the application handles downloading models from Hugging Face.

## Overview

The application allows users to download models from Hugging Face by providing a repository ID or URL. The process involves fetching repository data from the Hugging Face API, displaying the model information to the user, and then downloading the selected model file.

## Detailed Steps

1.  **User Input**: The user provides a Hugging Face repository ID or URL.

2.  **Fetch Repository Data**: The application fetches the repository data from Hugging Face.
    - The `useGetHFRepoData` hook is called with the repository ID.
    - The hook calls the `fetchHuggingFaceRepoData` function in `web/utils/huggingface.ts`.
    - The `fetchHuggingFaceRepoData` function constructs the Hugging Face API URL and fetches the repository data. It also fetches the file tree to get the file sizes and download URLs for each file.

3.  **Display Model Information**: The application displays the model information.
    - The `ModelPage` component in `web/screens/Hub/ModelPage/index.tsx` renders the model information, including the name, author, and a list of available files.

4.  **Download Model File**: The user clicks the download button for a specific model file.
    - The `ModelDownloadButton` component in `web/containers/ModelDownloadButton/index.tsx` initiates the download of the model file.
    - The `useDownloadModel` hook in `web/hooks/useDownloadModel.ts` is called, which in turn calls the `pullModel` method on the `ModelExtension`.
    - The `pullModel` method in `extensions/model-extension/src/index.ts` sends a POST request to the `/v1/models/pull` endpoint of the Cortex API.
    - The Cortex API is responsible for the actual download logic.

## Code Reference

-   `web/utils/huggingface.ts`: Contains the core logic for interacting with the Hugging Face API.
-   `web/hooks/useGetHFRepoData.ts`: A React hook that wraps the data fetching logic.
-   `web/screens/Hub/ModelPage/index.tsx`: The UI component that displays the model page.
-   `web/containers/ModelDownloadButton/index.tsx`: The UI component for the download button.
-   `web/hooks/useDownloadModel.ts`: A React hook that handles the download logic.
-   `extensions/model-extension/src/index.ts`: The model extension that communicates with the Cortex API.
