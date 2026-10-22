import { LandingLine } from './LandingLine';
import { Splash } from './Splash';
import './landing.css';

export default function LandingPage() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- static logo, same as before */}
      <img src="/mysemesterlogo.png" alt="MySemester Logo" />
      <h1>MySemester</h1>
      <LandingLine />
      <div className="loading">
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
      </div>
      <Splash />
    </>
  );
}
