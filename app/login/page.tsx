import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';
import './login.css';

export const metadata: Metadata = { title: 'Login' };

export default function LoginPage() {
  return (
    <>
      <div className="title">MySemester</div>
      <LoginForm />
    </>
  );
}
