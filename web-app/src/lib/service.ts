import { CoreRoutes, APIRoutes } from '@janhq/core'
import { getServiceHub } from '@/hooks/useServiceHub'
import { isPlatformTauri, isPlatformElectron } from '@/lib/platform'
import type { InvokeArgs } from '@/services/core/types'

export const AppRoutes = [
  'installExtensions',
  'getTools',
  'callTool',
  'cancelToolCall',
  'listThreads',
  'createThread',
  'modifyThread',
  'deleteThread',
  'listMessages',
  'createMessage',
  'modifyMessage',
  'deleteMessage',
  'getThreadAssistant',
  'createThreadAssistant',
  'modifyThreadAssistant',
  'saveMcpConfigs',
  'getMcpConfigs',
  'restartMcpServers',
  'getConnectedServers',
  'readLogs',
  'changeAppDataFolder',
  'openDialog', // Added for Electron mapping if needed, though usually exposed as open_dialog
  'saveDialog',
]

// Define API routes based on different route types
export const Routes = [...CoreRoutes, ...APIRoutes, ...AppRoutes].map((r) => ({
  path: `app`,
  route: r,
}))

// Function to open an external URL in a new browser window
export function openExternalUrl(url: string) {
  window?.open(url, '_blank')
}

// Helper to get server port with caching/retry logic if needed
async function getElectronServerPort(): Promise<number> {
  const electronAPI = (window as any).electronAPI;
  if (!electronAPI) throw new Error('Electron API not available');

  let port = await electronAPI.getServerPort();
  if (!port) {
      // Retry or wait? For now assume it's there or fails.
      // Maybe implement a wait loop in the UI layer, but here we just fail.
      throw new Error('Server port not yet available');
  }
  return port;
}

export const APIs = {
  ...Object.values(Routes).reduce((acc, proxy) => {
    return {
      ...acc,
      [proxy.route]: async (args?: InvokeArgs) => {
        if (isPlatformTauri()) {
          // For Tauri platform, use the service hub to invoke commands
          const command = proxy.route.replace(/([A-Z])/g, '_$1').toLowerCase()

          // Backward-compatible shim for start_server: wrap args into { config }
          if (command === 'start_server') {
            // If already using new shape, pass through
            if (args && 'config' in args) {
              return getServiceHub().core().invoke(command, args)
            }

            const raw: Record<string, unknown> = (args || {}) as Record<string, unknown>

            const pickString = (obj: Record<string, unknown>, keys: string[]): string | undefined => {
              for (const key of keys) {
                const value = obj[key]
                if (typeof value === 'string') return value
              }
              return undefined
            }

            const pickNumber = (obj: Record<string, unknown>, keys: string[]): number | undefined => {
              for (const key of keys) {
                const value = obj[key]
                if (typeof value === 'number') return value
              }
              return undefined
            }

            const pickStringArray = (obj: Record<string, unknown>, keys: string[]): string[] | undefined => {
              for (const key of keys) {
                const value = obj[key]
                if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
                  return value as string[]
                }
              }
              return undefined
            }

            const config = {
              host: pickString(raw, ['host']),
              port: pickNumber(raw, ['port']),
              prefix: pickString(raw, ['prefix']),
              api_key: pickString(raw, ['api_key', 'apiKey']),
              trusted_hosts: pickStringArray(raw, ['trusted_hosts', 'trustedHosts']),
              proxy_timeout: pickNumber(raw, ['proxy_timeout', 'proxyTimeout']),
            }
            return getServiceHub().core().invoke(command, { config })
          }

          return getServiceHub().core().invoke(command, args)
        } else if (isPlatformElectron()) {
            const command = proxy.route.replace(/([A-Z])/g, '_$1').toLowerCase();
            const electronAPI = (window as any).electronAPI;

            // Handle UI commands that must run in Main process
            if (['open_dialog', 'save_dialog', 'open_file_explorer', 'open_app_directory'].includes(command)) {
                return electronAPI.invoke(command, args);
            }

            // For now, map openExternalUrl separately or use window.open

             // Backward-compatible shim for start_server: wrap args into { config }
          if (command === 'start_server') {
            // If already using new shape, pass through
            if (args && 'config' in args) {
              // proceed
            } else {
                const raw: Record<string, unknown> = (args || {}) as Record<string, unknown>
                // ... same logic as Tauri ...
                const pickString = (obj: Record<string, unknown>, keys: string[]): string | undefined => {
                    for (const key of keys) {
                        const value = obj[key]
                        if (typeof value === 'string') return value
                    }
                    return undefined
                }
                const pickNumber = (obj: Record<string, unknown>, keys: string[]): number | undefined => {
                    for (const key of keys) {
                        const value = obj[key]
                        if (typeof value === 'number') return value
                    }
                    return undefined
                }
                const pickStringArray = (obj: Record<string, unknown>, keys: string[]): string[] | undefined => {
                    for (const key of keys) {
                        const value = obj[key]
                        if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
                            return value as string[]
                        }
                    }
                    return undefined
                }

                args = {
                    config: {
                        host: pickString(raw, ['host']),
                        port: pickNumber(raw, ['port']),
                        prefix: pickString(raw, ['prefix']),
                        api_key: pickString(raw, ['api_key', 'apiKey']),
                        trusted_hosts: pickStringArray(raw, ['trusted_hosts', 'trustedHosts']),
                        proxy_timeout: pickNumber(raw, ['proxy_timeout', 'proxyTimeout']),
                    }
                }
            }
          }

            const port = await getElectronServerPort();
            try {
                const response = await fetch(`http://127.0.0.1:${port}/api/${command}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(args || {})
                });
                if (!response.ok) {
                    throw new Error(await response.text());
                }
                // Handle void returns (empty body)
                const text = await response.text();
                return text ? JSON.parse(text) : null;
            } catch (e) {
                console.error(`API call ${command} failed:`, e);
                throw e;
            }

        } else {
          // For Web platform, provide fallback implementations
          console.warn(`API call '${proxy.route}' not supported in web environment`, args)
          return Promise.resolve(null)
        }
      },
    }
  }, {}),
  openExternalUrl,
}
