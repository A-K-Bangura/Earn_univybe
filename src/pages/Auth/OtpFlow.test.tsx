import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ signup:vi.fn(), resend:vi.fn() }));
vi.mock('../../hooks/useAuth', () => ({useAuth:()=>({signup:mocks.signup,verifyOtp:vi.fn(),isLoading:false,error:null})}));
vi.mock('../../services/auth', () => ({sendOtp:mocks.resend}));
vi.mock('../../components/auth/AuthLayout', () => ({AuthLayout:({children}:{children:React.ReactNode})=><>{children}</>}));
import { Signup } from './Signup';
import { VerifyOtp } from './VerifyOtp';
describe('OTP request feedback', () => {
  beforeEach(()=>{vi.clearAllMocks();localStorage.clear();});
  afterEach(()=>vi.useRealTimers());
  it('does not claim a code was sent while signup is pending or rejected', async()=>{
    let reject!: (reason:Error)=>void;
    mocks.signup.mockReturnValue(new Promise((_,fail)=>{reject=fail;}));
    render(<MemoryRouter><Signup/></MemoryRouter>);
    fireEvent.change(screen.getByRole('textbox'),{target:{value:'person@example.invalid'}});
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);
    expect(screen.queryByRole('heading',{name:'Check Your Email'})).not.toBeInTheDocument();
    await act(async()=>reject(new Error('offline')));
    expect(screen.queryByRole('heading',{name:'Check Your Email'})).not.toBeInTheDocument();
  });
  it('resends through the existing service and leaves retry available after failure', async()=>{
    vi.useFakeTimers();localStorage.setItem('signup_email','person@example.invalid');mocks.resend.mockRejectedValue(new Error('Please try again'));
    render(<MemoryRouter><VerifyOtp/></MemoryRouter>);
    for(let second=0;second<60;second++) await act(async()=>vi.advanceTimersByTime(1000));
    await act(async()=>fireEvent.click(screen.getByRole('button',{name:/Resend/})));
    expect(mocks.resend).toHaveBeenCalledWith('person@example.invalid');expect(screen.getByText('Please try again')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:/Resend/})).not.toBeDisabled();
  });
});
