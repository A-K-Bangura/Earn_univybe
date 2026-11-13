import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DiscoverEntry } from './DiscoverEntry';

beforeEach(() => localStorage.clear());
function mount() {
  render(<MemoryRouter initialEntries={['/discover']}><Routes>
    <Route path="/discover" element={<DiscoverEntry guest={<p>Main platform landing</p>}><p>Earn dashboard</p></DiscoverEntry>}/>
    <Route path="/onboarding" element={<p>Finish onboarding</p>}/>
  </Routes></MemoryRouter>);
}
describe('Discover visitor routing', () => {
  it('shows the public landing at /discover without requiring login', () => {
    mount(); expect(screen.getByText('Main platform landing')).toBeInTheDocument();
    expect(screen.queryByText('Earn dashboard')).not.toBeInTheDocument();
  });
  it('retains the authenticated Discover dashboard', () => {
    localStorage.setItem('auth_token', 'test');
    localStorage.setItem('user', JSON.stringify({id:1,firstname:'A',lastname:'B',level:'300'}));
    mount(); expect(screen.getByText('Earn dashboard')).toBeInTheDocument();
  });
  it('continues to require onboarding for pending accounts', () => {
    localStorage.setItem('pending_auth_token', 'test');
    mount(); expect(screen.getByText('Finish onboarding')).toBeInTheDocument();
  });
});
