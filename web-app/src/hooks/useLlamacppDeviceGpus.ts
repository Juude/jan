import { useEffect, useState } from 'react'
import { getLlamacppDevices, DeviceList } from '@/services/hardware'
import { localStorageKey } from '@/constants/localStorage'
import { events } from '@janhq/core'

interface UseLlamacppDeviceGpusResult {
  devices: DeviceList[]
  loading: boolean
  error: Error | null
  toggleDeviceActive: (id: string) => void
  refetch: () => void
}

export function useLlamacppDeviceGpus(): UseLlamacppDeviceGpusResult {
  const [devices, setDevices] = useState<DeviceList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  const toggleDeviceActive = (id: string) => {
    setDevices((prevDevices) => {
      const updatedDevices = prevDevices.map((device) =>
        device.id === id ? { ...device, active: !device.active } : device
      )
      localStorage.setItem(
        localStorageKey.llamacppDeviceGpus,
        JSON.stringify(updatedDevices)
      )
      return updatedDevices
    })
  }

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1)
  }

  const updateDevices = (newDevices: DeviceList[]) => {
    setDevices((prevDevices) => {
      // Check if device IDs are different
      const prevIds = prevDevices.map(d => d.id).sort()
      const newIds = newDevices.map(d => d.id).sort()
      
      // If IDs are the same, no need to update
      if (prevIds.length === newIds.length && prevIds.every((id, index) => id === newIds[index])) {
        return prevDevices
      }

      // Load persisted device states from localStorage
      const persistedDevices = localStorage.getItem(localStorageKey.llamacppDeviceGpus)
      let devicesWithState: DeviceList[]

      if (persistedDevices) {
        try {
          const parsed = JSON.parse(persistedDevices) as DeviceList[]
          // Merge persisted states with new devices
          devicesWithState = newDevices.map((device) => {
            const persistedDevice = parsed.find((p) => p.id === device.id)
            return {
              ...device,
              active: persistedDevice?.active ?? true,
            }
          })
        } catch {
          // If parsing fails, use default active state
          devicesWithState = newDevices.map((d) => ({ ...d, active: true }))
        }
      } else {
        // Set all devices' active to true by default
        devicesWithState = newDevices.map((d) => ({ ...d, active: true }))
      }

      // Update localStorage
      localStorage.setItem(
        localStorageKey.llamacppDeviceGpus,
        JSON.stringify(devicesWithState)
      )

      return devicesWithState
    })
  }

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    getLlamacppDevices()
      .then((devs) => {
        if (isMounted) {
          // Load persisted device states from localStorage
          const persistedDevices = localStorage.getItem(
            localStorageKey.llamacppDeviceGpus
          )
          let devicesWithState: DeviceList[]

          // If API returns empty array, keep existing localStorage data
          if (devs.length === 0) {
            if (persistedDevices) {
              try {
                const parsed = JSON.parse(persistedDevices) as DeviceList[]
                setDevices(parsed)
                setLoading(false)
                return
              } catch {
                // If parsing fails, set empty array
                setDevices([])
                setLoading(false)
                return
              }
            } else {
              // No persisted data and empty API response
              setDevices([])
              setLoading(false)
              return
            }
          }

          if (persistedDevices) {
            try {
              const parsed = JSON.parse(persistedDevices) as DeviceList[]
              // Merge persisted states with current devices
              devicesWithState = devs.map((device) => {
                const persistedDevice = parsed.find((p) => p.id === device.id)
                return {
                  ...device,
                  active: persistedDevice?.active ?? true,
                }
              })
            } catch {
              // If parsing fails, use default active state
              devicesWithState = devs.map((d) => ({ ...d, active: true }))
            }
          } else {
            // Set all devices' active to true by default
            devicesWithState = devs.map((d) => ({ ...d, active: true }))
          }

          setDevices(devicesWithState)
          localStorage.setItem(
            localStorageKey.llamacppDeviceGpus,
            JSON.stringify(devicesWithState)
          )
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err)
          setLoading(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [refetchTrigger])

  // Listen for devicesUpdated event from the backend
  useEffect(() => {
    const handleDevicesUpdated = (event: { devices: DeviceList[] }) => {
      console.log('Devices updated event received:', event)
      updateDevices(event.devices)
    }

    // Subscribe to the devicesUpdated event
    events.on('devicesUpdated', handleDevicesUpdated)

    // Cleanup subscription on unmount
    return () => {
      events.off('devicesUpdated', handleDevicesUpdated)
    }
  }, [])

  return { devices, loading, error, toggleDeviceActive, refetch }
}
