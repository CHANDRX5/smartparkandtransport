import React from 'react';
import { Link } from 'react-router-dom';
import {
  Car,
  MapPin,
  Navigation,
  Bus,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Compass,
  AlertTriangle
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-visible bg-gradient-to-b from-navy-950 via-navy-900 to-navy-850 text-white pt-16 pb-24 rounded-3xl mt-4 mx-4 sm:mx-6 lg:mx-8 px-6 sm:px-12 shadow-2xl border border-navy-800">
        {/* Subtle grid background glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-400/20 text-brand-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-brand-400" />
            AI-Driven Urban Mobility & Smart Parking Ecosystem
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight sm:leading-none">
            Find Parking Faster. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
              Recover Lost Vehicles Smarter.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-light">
            An all-in-one urban mobility platform with AI-predicted parking availability,
            advance bay booking, multi-option long-distance routes, and an automated
            Lost & Found vehicle recovery engine.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-4">
            <Link
              to="/parking"
              className="px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-600/30 hover:shadow-brand-600/50 transition-all flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Find Live Parking Spot
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/lost-found"
              className="px-6 py-3.5 rounded-xl bg-navy-800/80 hover:bg-navy-700/80 border border-slate-700 text-white font-semibold text-sm backdrop-blur-md transition-all flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Report Lost Vehicle
            </Link>
          </div>

          {/* Quick Demo Credentials Banner */}
          <div className="mt-8 pt-6 border-t border-navy-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="p-2.5 rounded-xl bg-navy-800/50 border border-navy-700">
              <span className="text-slate-400">Citizen:</span> <strong className="text-white">user@smartpark.ai</strong> (User@123)
            </div>
            <div className="p-2.5 rounded-xl bg-navy-800/50 border border-navy-700">
              <span className="text-slate-400">Operator:</span> <strong className="text-white">operator@smartpark.ai</strong> (Operator@123)
            </div>
            <div className="p-2.5 rounded-xl bg-navy-800/50 border border-navy-700">
              <span className="text-slate-400">Admin:</span> <strong className="text-white">admin@smartpark.ai</strong> (Admin@123)
            </div>
          </div>
        </div>
      </section>

      {/* Live Metrics Row */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs card-hover">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-navy-950">900+</div>
                <div className="text-xs text-slate-500 font-medium">Smart Parking Bays</div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs card-hover">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-navy-950">94.8%</div>
                <div className="text-xs text-slate-500 font-medium">AI Forecast Accuracy</div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs card-hover">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-navy-950">94.5%</div>
                <div className="text-xs text-slate-500 font-medium">Vehicle Match Score</div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs card-hover">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-navy-950">&lt; 2 min</div>
                <div className="text-xs text-slate-500 font-medium">Avg. Booking Time</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Modules Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-950">
            Intelligent Platform Capabilities
          </h2>
          <p className="text-sm text-slate-500">
            Engineered with scikit-learn predictive models, OpenStreetMap routing, and multi-tenant security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-brand-300 card-hover space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100/70 text-brand-600 flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-navy-950">Smart Parking Discovery</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Explore real-time interactive maps with instant vacancy counts, hourly pricing,
              amenity filters (EV fast chargers, disabled access, covered parking), and advance reservation.
            </p>
            <Link
              to="/parking"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              Explore Map &rarr;
            </Link>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-brand-300 card-hover space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-navy-950">AI Availability Prediction</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Trained on historical occupancy trends and event schedules. Predicts future parking
              crowding hour-by-hour so you never arrive at a full lot.
            </p>
            <Link
              to="/parking"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              View Predictions &rarr;
            </Link>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-brand-300 card-hover space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-navy-950">Lost & Found Vehicle Recovery</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Integrated reporting for missing or found vehicles. Utilizes explainable rule-based
              similarity matching on license plates, make, model, color, and coordinates.
            </p>
            <Link
              to="/lost-found"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700"
            >
              Recovery Portal &rarr;
            </Link>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-brand-300 card-hover space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100/70 text-purple-600 flex items-center justify-center">
              <Navigation className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-navy-950">Long-Distance Route Planner</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Evaluate shortest practical routes, toll-free bypasses, road clearances, and
              live weather condition warnings along your itinerary.
            </p>
            <Link
              to="/routes"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700"
            >
              Plan Journey &rarr;
            </Link>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-brand-300 card-hover space-y-4">
            <div className="w-12 h-12 rounded-xl bg-sky-100/70 text-sky-600 flex items-center justify-center">
              <Bus className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-navy-950">Public Transit Crowd AI</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Monitor commuter congestion on metro lines and city buses. Highlights Low, Moderate,
              High, and Peak travel windows to optimize commute timing.
            </p>
            <Link
              to="/transport"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700"
            >
              Check Transit Crowds &rarr;
            </Link>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-brand-300 card-hover space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-navy-950">GPS Facility Radar</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Discover nearby EV superchargers, 24/7 emergency hospitals, fuel pumps, and
              parking spaces centered directly around your current GPS coordinates.
            </p>
            <Link
              to="/tracker"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              Launch Radar &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works Workflow */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl font-bold">Seamless 3-Step Parking Workflow</h2>
            <p className="text-xs text-slate-400">
              Guaranteed bay reservation with instant digital receipt & navigation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center mx-auto sm:mx-0">
                1
              </div>
              <h4 className="font-bold text-sm text-white">Search & Check AI Occupancy</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose a parking facility, view current vacancy counts, and inspect hourly AI forecasts.
              </p>
            </div>

            <div className="space-y-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center mx-auto sm:mx-0">
                2
              </div>
              <h4 className="font-bold text-sm text-white">Reserve & Secure Bay</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Input vehicle plate, select arrival duration, and complete payment via Razorpay or Sandbox.
              </p>
            </div>

            <div className="space-y-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center mx-auto sm:mx-0">
                3
              </div>
              <h4 className="font-bold text-sm text-white">Navigate & Check-In</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Follow turn-by-turn Leaflet GPS directions, show your booking QR/Ref, and drive straight in.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
