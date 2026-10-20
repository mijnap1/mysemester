import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GradeLoader } from './GradeLoader';
import './grade.css';

export const metadata: Metadata = { title: 'Grade Tracker' };

export default function GradePage() {
  return (
    <Suspense>
      <GradeLoader />
    </Suspense>
  );
}
