/**
 * Platform Feature Configuration
 * Centralized feature flags for different platforms
 */

import { PlatformFeature } from './types'
import { isPlatformTauri, isPlatformIOS, isPlatformAndroid, isPlatformElectron } from './utils'

const isNative = isPlatformTauri() || isPlatformElectron()

/**
 * Platform Features Configuration
 * Centralized feature flags for different platforms
 */
export const PlatformFeatures: Record<PlatformFeature, boolean> = {
  // Hardware monitoring and GPU usage
  [PlatformFeature.HARDWARE_MONITORING]:
    isNative && !isPlatformIOS() && !isPlatformAndroid(),

  // Local model inference (llama.cpp)
  [PlatformFeature.LOCAL_INFERENCE]:
    isNative && !isPlatformIOS() && !isPlatformAndroid(),

  // Local API server
  [PlatformFeature.LOCAL_API_SERVER]:
    isNative && !isPlatformIOS() && !isPlatformAndroid(),

  // Hub/model downloads
  [PlatformFeature.MODEL_HUB]:
    isNative && !isPlatformIOS() && !isPlatformAndroid(),

  // System integrations (logs, file explorer, etc.)
  [PlatformFeature.SYSTEM_INTEGRATIONS]:
    isNative && !isPlatformIOS() && !isPlatformAndroid(),

  // HTTPS proxy
  [PlatformFeature.HTTPS_PROXY]:
    isNative && !isPlatformIOS() && !isPlatformAndroid(),

  // Default model providers (OpenAI, Anthropic, etc.) - disabled for web-only Jan builds
  [PlatformFeature.DEFAULT_PROVIDERS]: isNative,

  // Projects management
  [PlatformFeature.PROJECTS]:
    isNative && !isPlatformIOS() && !isPlatformAndroid(),

  // Analytics and telemetry - disabled for web
  [PlatformFeature.ANALYTICS]:
    isNative && !isPlatformIOS() && !isPlatformAndroid(),

  // Web-specific automatic model selection from jan provider - enabled for web only
  [PlatformFeature.WEB_AUTO_MODEL_SELECTION]: !isNative,

  // Model provider settings page management - disabled for web only
  [PlatformFeature.MODEL_PROVIDER_SETTINGS]: isNative,

  // Auto-enable MCP tool permissions - enabled for web platform
  [PlatformFeature.MCP_AUTO_APPROVE_TOOLS]: !isNative,

  // MCP servers settings page - disabled for web
  [PlatformFeature.MCP_SERVERS_SETTINGS]:
    isNative && !isPlatformIOS() && !isPlatformAndroid(),

  // Extensions settings page - disabled for web
  [PlatformFeature.EXTENSIONS_SETTINGS]:
    isNative,

  // Assistant functionality - disabled for web
  [PlatformFeature.ASSISTANTS]: isNative,

  // Authentication (Google OAuth) - enabled for web only
  [PlatformFeature.AUTHENTICATION]: !isNative,

  // Google Analytics - enabled for web only
  [PlatformFeature.GOOGLE_ANALYTICS]: !isNative,

  // Alternate shortcut bindings - enabled for web only (to avoid browser conflicts)
  [PlatformFeature.ALTERNATE_SHORTCUT_BINDINGS]:
    !isNative && !isPlatformIOS() && !isPlatformAndroid(),

  // Shortcut
  [PlatformFeature.SHORTCUT]: !isPlatformIOS() && !isPlatformAndroid(),

  // First message persisted thread - enabled for web and mobile platforms
  [PlatformFeature.FIRST_MESSAGE_PERSISTED_THREAD]: !isNative || isPlatformIOS() || isPlatformAndroid(),

  // Temporary chat mode - enabled for web only
  [PlatformFeature.TEMPORARY_CHAT]: !isNative,

  // File attachments/RAG UI and tooling - desktop platforms only
  [PlatformFeature.FILE_ATTACHMENTS]:
    isNative && !isPlatformIOS() && !isPlatformAndroid(),
}
