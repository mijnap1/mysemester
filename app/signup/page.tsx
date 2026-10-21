import type { Metadata } from 'next';
import { CardThemeToggle } from '@/components/AuthBits';
import { SignupForm } from './SignupForm';
import './signup.css';

export const metadata: Metadata = { title: 'Sign Up' };

export default function SignupPage() {
  return (
    <>
      <div className="title">MySemester</div>
      <div className="card">
        <CardThemeToggle />
        <h1>Create Account</h1>
        <SignupForm />
      </div>
    </>
  );
}
