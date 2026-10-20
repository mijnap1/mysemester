import { Splash } from './Splash';
import './landing.css';

export default function LandingPage() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- static logo, same as before */}
      <img src="/mysemesterlogo.png" alt="MySemester Logo" />
      <h1>MySemester</h1>
      <p className="description">
        Smartly track your university grades, plan courses, and stay on top of your semester. MySemester helps you
        visualize progress, organize assessments, and keep everything academic in one simple dashboard.
      </p>
      <div className="loading">
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
      </div>
      <Splash />
    </>
  );
}
