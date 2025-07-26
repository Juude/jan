/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react'
import { events } from '@janhq/core'
import { useModelProvider } from '@/hooks/useModelProvider'
import { getProviders } from '@/services/providers'
import { useLlamacppDeviceGpus } from '@/hooks/useLlamacppDeviceGpus'

/**
 * GlobalEventHandler handles global events that should be processed across all screens
 * This provider should be mounted at the root level to ensure all screens can benefit from global event handling
 */
export function GlobalEventHandler() {
  const { setProviders } = useModelProvider()
  const { refetch } = useLlamacppDeviceGpus()

  // Handle settingsChanged event globally
  useEffect(() => {
    const handleSettingsChanged = async (event: {
      key: string
      value: string
    }) => {
      console.log('Global settingsChanged event:', event)

      // Handle version_backend changes specifically
      if (event.key === 'version_backend') {
        try {
          // Refresh providers to get updated settings from the extension
          const updatedProviders = await getProviders()
          setProviders(updatedProviders)
          console.log('Providers refreshed after version_backend change')
        } catch (error) {
          console.error(
            'Failed to refresh providers after settingsChanged:',
            error
          )
        }
      }

      // Add more global event handlers here as needed
      // For example:
      // if (event.key === 'some_other_setting') {
      //   // Handle other setting changes
      // }
    }

    // Subscribe to the settingsChanged event
    events.on('settingsChanged', handleSettingsChanged)

    // Cleanup subscription on unmount
    return () => {
      events.off('settingsChanged', handleSettingsChanged)
    }
  }, [setProviders])

  // Listen for devicesUpdated event from the backend
  useEffect(() => {
    const handleDevicesUpdated = (event: { devices: any[] }) => {
      console.log('Devices updated event received:', event)
      refetch()
    }

    // Subscribe to the devicesUpdated event
    events.on('devicesUpdated', handleDevicesUpdated)

    // Cleanup subscription on unmount
    return () => {
      events.off('devicesUpdated', handleDevicesUpdated)
    }
  }, [refetch])

  // This component doesn't render anything
  return null
}
