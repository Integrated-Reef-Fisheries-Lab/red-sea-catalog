import { getAllSources } from '@/lib/sources';
import BrowseView from '@/components/BrowseView';

export default function HomePage() {
  const sources = getAllSources();
  return <BrowseView sources={sources} />;
}
