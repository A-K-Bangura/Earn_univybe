import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight, MessageSquare } from 'lucide-react';
import { FeaturePage } from '../components/layout/FeaturePage';
import { OpportunityCard } from '../components/opportunities/OpportunityCard';
import { GigCard } from '../components/gigs/GigCard';
import { getOpportunities, getOpportunityVocabulary } from '../services/opportunities';
import { getGigs } from '../services/gigs';
import { getCurrentUser } from '../services/auth';
import { accountScope } from '../utils/accountScope';

export function Discover() {
  const filters = { page: 1, per_page: 4 };
  const opportunities = useQuery({ queryKey: ['opportunities', 'list', filters, false], queryFn: () => getOpportunities(filters) });
  const gigs = useQuery({ queryKey: ['gigs', 'list', accountScope(), filters, false], queryFn: () => getGigs(filters) });
  const vocabulary = useQuery({ queryKey: ['opportunity-vocabulary'], queryFn: getOpportunityVocabulary, staleTime: 3600000 });
  const name = getCurrentUser()?.firstname;
  return <FeaturePage title={name ? `Your next chapter, ${name}.` : 'Your next chapter starts here.'} description="Find an opportunity. Put your skills to work. Stay connected to your community.">
    <div className="mb-9 flex flex-wrap gap-3"><Link className="earn-button" to="/opportunities">Explore opportunities <ArrowUpRight size={18}/></Link><Link className="earn-button-secondary" to="/gigs">Find a gig</Link></div>
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_280px]">
      <div className="space-y-10">
        <section aria-labelledby="recent-opportunities"><div className="mb-4 flex items-center justify-between gap-3"><h2 id="recent-opportunities" className="text-xl font-bold">Recent opportunities</h2><Link to="/opportunities" className="text-sm font-semibold text-blue-violet-400 dark:text-blue-violet-700">Browse all →</Link></div>
          {opportunities.isPending ? <PreviewSkeleton/> : opportunities.isError ? <PreviewError retry={() => void opportunities.refetch()}/> : opportunities.data.data.length ? <div className="space-y-3">{opportunities.data.data.map(item => <OpportunityCard key={item.id} opportunity={item}/>)}</div> : <p className="earn-empty">No open opportunities right now. Check back soon.</p>}
        </section>
        <section aria-labelledby="latest-gigs"><div className="mb-4 flex items-center justify-between gap-3"><h2 id="latest-gigs" className="text-xl font-bold">Latest gigs</h2><Link to="/gigs" className="text-sm font-semibold text-blue-violet-400 dark:text-blue-violet-700">Browse all →</Link></div>
          {gigs.isPending ? <PreviewSkeleton/> : gigs.isError ? <PreviewError retry={() => void gigs.refetch()}/> : gigs.data.data.length ? <div className="space-y-3">{gigs.data.data.map(item => <GigCard key={item.id} gig={item}/>)}</div> : <p className="earn-empty">No open gigs right now. Your next opportunity could be around the corner.</p>}
        </section>
      </div>
      <aside className="space-y-6"><section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><h2 className="mb-4 text-lg font-bold">Explore by category</h2>{vocabulary.isPending ? <PreviewSkeleton/> : vocabulary.isError ? <PreviewError retry={() => void vocabulary.refetch()}/> : <div className="flex flex-wrap gap-2">{vocabulary.data.opportunity_types.map(type => <Link className="rounded-full bg-blue-violet-900 px-3 py-2 text-sm font-medium text-blue-violet-300 hover:bg-blue-violet-800 dark:bg-blue-violet-100 dark:text-blue-violet-700" key={type.value} to={`/opportunities?type=${encodeURIComponent(type.value)}`}>{type.label}</Link>)}</div>}</section>
        <section className="rounded-2xl bg-blue-violet-500 p-6 text-white"><MessageSquare className="mb-4 h-8 w-8"/><h2 className="text-xl font-bold">Good things start with community.</h2><p className="my-3 text-sm leading-relaxed">Catch up on conversations, ideas and updates from UniVybe.</p><Link className="mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4" to="/feed">Explore the community →</Link></section>
      </aside>
    </div>
  </FeaturePage>;
}
function PreviewSkeleton() { return <div role="status" aria-label="Loading" className="space-y-3">{[0,1].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800"/>)}</div>; }
function PreviewError({ retry }: { retry: () => void }) { return <div role="alert" className="earn-empty"><p>We couldn’t load this section.</p><button onClick={retry} className="mt-3 font-semibold underline">Try again</button></div>; }
