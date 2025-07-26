import { useEffect, useState } from 'react'
import { getLlamacppDevices, DeviceList } from '@/services/hardware'
import { localStorageKey } from '@/constants/localStorage'

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
      localStorage.setItem(localStorageKey.llamacppDeviceGpus, JSON.stringify(updatedDevices))
      return updatedDevices
    })
  }

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1)
  }

  const fetchDevicesWithRetry = async (retries = 3, delay = 2000): Promise<DeviceList[]> => {
    for (let i = 0; i < retries; i++) {
      try {
        const devices = await getLlamacppDevices()
        if (devices.length > 0) {
          return devices
        }
        // If empty array and not the last retry, wait and try again
        if (i < retries - 1) {
          console.log(`Device fetch returned empty, retrying in ${delay}ms... (attempt ${i + 1}/${retries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error) {
        if (i === retries - 1) {
          throw error
        }
        console.log(`Device fetch failed, retrying in ${delay}ms... (attempt ${i + 1}/${retries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    return []
  }

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    fetchDevicesWithRetry()
      .then((devs) => {
        if (isMounted) {
          // Load persisted device states from localStorage
          const persistedDevices = localStorage.getItem(localStorageKey.llamacppDeviceGpus)
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
  }, [refetchTrigger])

  return { devices, loading, error, toggleDeviceActive, refetch }
}
