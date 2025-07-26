import { useEffect, useState } from 'react'
import { getLlamacppDevices, DeviceList } from '@/services/hardware'
import { localStorageKey } from '@/constants/localStorage'

interface UseLlamacppDeviceGpusResult {
  devices: DeviceList[]
  loading: boolean
  error: Error | null
  toggleDeviceActive: (id: string) => void
}

export function useLlamacppDeviceGpus(): UseLlamacppDeviceGpusResult {
  const [devices, setDevices] = useState<DeviceList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const toggleDeviceActive = (id: string) => {
    setDevices((prevDevices) => {
      const updatedDevices = prevDevices.map((device) =>
        device.id === id ? { ...device, active: !device.active } : device
      )
      localStorage.setItem(localStorageKey.llamacppDeviceGpus, JSON.stringify(updatedDevices))
      return updatedDevices
    })
  }

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    getLlamacppDevices()
      .then((devs) => {
        if (isMounted) {
          // Load persisted device states from localStorage
          const persistedDevices = localStorage.getItem(localStorageKey.llamacppDeviceGpus)
          let devicesWithState: DeviceList[]
          
          if (persistedDevices) {
            try {
              const parsed = JSON.parse(persistedDevices) as DeviceList[]
              // Merge persisted states with current devices
              devicesWithState = devs.map((device) => {
                const persistedDevice = parsed.find((p) => p.id === device.id)
                return {
                  ...device,
                  active: persistedDevice?.active ?? true
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
          localStorage.setItem(localStorageKey.llamacppDeviceGpus, JSON.stringify(devicesWithState))
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
  }, [])

  return { devices, loading, error, toggleDeviceActive }
}
