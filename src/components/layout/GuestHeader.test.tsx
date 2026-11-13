import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EarnNavigation } from './EarnNavigation';
import { GuestHeader } from './GuestHeader';
describe('Earn navigation', () => {
 beforeEach(() => localStorage.clear());
 it('has independent destinations and highlights the parent of a gig detail', () => {
  localStorage.setItem('auth_token','test');render(<MemoryRouter initialEntries={['/gigs/42']}><EarnNavigation mobile/></MemoryRouter>);
  const nav=within(screen.getByRole('navigation'));
  expect(nav.getAllByRole('link').map(link=>link.textContent)).toEqual(['Discover','Opportunities','Gigs','Feed','Profile']);
  expect(nav.getByRole('link',{name:'Gigs'})).toHaveAttribute('aria-current','page');
  expect(nav.getByRole('link',{name:'Feed'})).toHaveAttribute('href','/feed');
 });
 it('auth header links to public independent destinations', () => {
  render(<MemoryRouter><GuestHeader variant="app"/></MemoryRouter>);
  expect(screen.getAllByRole('link',{name:'Opportunities'})[0]).toHaveAttribute('href','/opportunities');
  expect(screen.getAllByRole('link',{name:'Gigs'})[0]).toHaveAttribute('href','/gigs');
  expect(screen.queryByRole('link',{name:'Courses'})).not.toBeInTheDocument();
 });
});
