import { useParams } from 'react-router-dom'
import { CollectionDetail } from '@/components/collection-detail'

export function CollectionPage() {
  const { collectionId = '' } = useParams<{ collectionId: string }>()
  return <CollectionDetail collectionId={collectionId} />
}
