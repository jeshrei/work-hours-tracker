'use client';

import React from 'react';
import WorkHoursTracker from './components/WorkHoursTracker';

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <WorkHoursTracker />
    </main>
  );
}