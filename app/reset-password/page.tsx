import type { Metadata } from 'next';
import { ResetForm } from './ResetForm';
import './reset-password.css';

export const metadata: Metadata = { title: 'Reset Password' };

export default function ResetPasswordPage() {
  return (
    <>
      <div className="title">MySemester</div>
      <ResetForm />
    </>
  );
}
