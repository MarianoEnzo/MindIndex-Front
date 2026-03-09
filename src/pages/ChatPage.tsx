import { useParams } from 'react-router-dom'
import useSWR from 'swr'
import { getCollections } from '@/lib/api'
import type { Collection } from '@/lib/api'
import { ChatView } from '@/components/chat-view'

export function ChatPage() {
  const { collectionId = '' } = useParams<{ collectionId: string }>()
  const { data: collections } = useSWR<Collection[]>('collections', getCollections)
  const collectionName = collections?.find((c) => c.id === collectionId)?.name ?? collectionId

  return <ChatView collectionId={collectionId} collectionName={collectionName} />
}
