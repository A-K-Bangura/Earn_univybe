import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { Gig, GigInterestResult } from '../types/gig';
const mocks = vi.hoisted(() => ({interest:vi.fn()}));
vi.mock('../services/gigs',()=>({expressGigInterest:mocks.interest}));
import { useGigInterest } from './useGigInterest';
describe('gig contact account boundary',()=>{
  beforeEach(()=>{localStorage.clear();vi.clearAllMocks();});
  it('closes a pending contact tab and discards contact data after an account switch',async()=>{
    localStorage.setItem('auth_token','test-a');localStorage.setItem('user',JSON.stringify({id:'a'}));
    let complete!: (data:GigInterestResult)=>void;
    mocks.interest.mockReturnValue(new Promise(resolve=>{complete=resolve;}));
    const tab={close:vi.fn(),location:{href:''},opener:null};vi.spyOn(window,'open').mockReturnValue(tab as unknown as Window);
    const client=new QueryClient();const wrapper=({children}:{children:ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const {result}=renderHook(()=>useGigInterest(),{wrapper});let pending!:Promise<GigInterestResult|undefined>;
    await act(async()=>{pending=result.current.contact({id:7} as Gig,'whatsapp');});
    localStorage.setItem('auth_token','test-b');localStorage.setItem('user',JSON.stringify({id:'b'}));
    await act(async()=>{complete({gig:{id:7},contact:{whatsapp:{url:'https://wa.me/12345678'}}} as GigInterestResult);await pending;});
    expect(await pending).toBeUndefined();expect(tab.close).toHaveBeenCalled();expect(tab.location.href).toBe('');expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});
