import type { Metadata } from 'next';
import { SetupWizard } from './SetupWizard';
import './setup.css';

export const metadata: Metadata = { title: 'Setup' };

export default function SetupPage() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- only this page uses Google Sans */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400&display=swap" />
      <SetupWizard />
    </>
  );
}
