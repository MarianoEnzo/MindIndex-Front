import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from '@/lib/app-context'
import { HomePage } from '@/components/home-page'
import { ChatPage } from '@/pages/ChatPage'
import { CollectionPage } from '@/pages/CollectionPage'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat/:collectionId" element={<ChatPage />} />
          <Route path="/collections/:collectionId" element={<CollectionPage />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
