import type { Metadata } from 'next';
import { DashboardLoader } from './DashboardLoader';
import './main.css';
import './upcoming.css';

export const metadata: Metadata = { title: 'MySemester' };

export default function MainPage() {
  return <DashboardLoader />;
}
