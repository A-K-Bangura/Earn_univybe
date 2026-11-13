import { Link } from 'react-router-dom';
import { FeaturePage } from '../components/layout/FeaturePage';
import { LEARN_URL } from '../components/common/LearnHandoff';
export function Transition({ learning = false }: { learning?: boolean }) {
  return <FeaturePage title={learning ? 'Learning lives on UniVybe Learn' : 'Page not found'} description={learning ? 'Your learning account and progress stay with UniVybe. Earn is your space for opportunities, gigs and community.' : 'This link may have changed or the page is no longer available.'}><div className="flex flex-wrap gap-3">{learning && <a className="earn-button" href={LEARN_URL}>Go to UniVybe Learn ↗</a>}<Link className="earn-button" to="/">Back to Earn</Link></div></FeaturePage>;
}
