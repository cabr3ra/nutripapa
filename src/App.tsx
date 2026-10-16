import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { AuthProvider } from './features/auth/AuthProvider'
import { RequireAuth } from './features/auth/RequireAuth'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { HistoryScreen } from './features/weekly-sheets/HistoryScreen'
import { WeeklySheetScreen } from './features/weekly-sheets/WeeklySheetScreen'

// Todas las rutas cuelgan de RequireAuth: sin sesión se pide el código en la misma URL.
// "/" es la tabla de la semana actual; cualquier ruta desconocida vuelve ahí.
const router = createBrowserRouter([
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <WeeklySheetScreen /> },
      { path: '/tabla/:sheetId', element: <WeeklySheetScreen /> },
      { path: '/historial', element: <HistoryScreen /> },
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
