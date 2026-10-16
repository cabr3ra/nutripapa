import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { AuthProvider } from './features/auth/AuthProvider'
import { RequireAuth } from './features/auth/RequireAuth'
import { HomeScreen } from './features/home/HomeScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'

// Todas las rutas cuelgan de RequireAuth: sin sesión se pide el código en la misma URL.
// Cualquier ruta desconocida vuelve a la pantalla principal (también protegida).
const router = createBrowserRouter([
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <HomeScreen /> },
      { path: '/ajustes', element: <SettingsScreen /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
