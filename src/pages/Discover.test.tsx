import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
const calls = vi.hoisted(() => ({ opportunities:vi.fn(), gigs:vi.fn(), vocabulary:vi.fn(), feed:vi.fn(), dashboard:vi.fn() }));
vi.mock('../services/opportunities', () => ({getOpportunities:calls.opportunities,getOpportunityVocabulary:calls.vocabulary}));
vi.mock('../services/gigs', () => ({getGigs:calls.gigs}));
vi.mock('../services/feed', () => ({getFeedPosts:calls.feed}));
vi.mock('../services/dashboard', () => ({getDashboard:calls.dashboard}));
import { Discover } from './Discover';
describe('Discover requests', () => {
  beforeEach(() => {vi.clearAllMocks(); localStorage.clear(); calls.opportunities.mockResolvedValue({data:[]});calls.gigs.mockResolvedValue({data:[]});calls.vocabulary.mockResolvedValue({opportunity_types:[{value:'internship',label:'Internships'}]});});
  const mount = () => render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><Discover/></MemoryRouter></QueryClientProvider>);
  it('loads small previews without consuming Feed or loading academics', async () => {
    mount(); expect(await screen.findByText('No open opportunities right now. Check back soon.')).toBeInTheDocument();
    expect(calls.opportunities).toHaveBeenCalledWith({page:1,per_page:4}); expect(calls.gigs).toHaveBeenCalledWith({page:1,per_page:4});
    expect(calls.feed).not.toHaveBeenCalled();expect(calls.dashboard).not.toHaveBeenCalled();
    expect(screen.getByRole('link',{name:'Internships'})).toHaveAttribute('href','/opportunities?type=internship');
  });
  it('keeps other sections usable when one listing fails', async () => {
    calls.opportunities.mockRejectedValue(new Error('offline'));mount(); expect(await screen.findByRole('button',{name:'Try again'})).toBeInTheDocument();
    expect(screen.getByText(/No open gigs right now/)).toBeInTheDocument(); expect(screen.getByRole('link',{name:/Explore the community/})).toHaveAttribute('href','/feed');
  });
});
