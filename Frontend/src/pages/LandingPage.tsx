import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Radio, Brain, Globe,
  FileText, ArrowRight, Users, CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FullPageSpinner } from '../components/Spinner';

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) navigate('/dashboard', { replace: true });
  }, [user, isLoading, navigate]);

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="min-h-screen" style={{ background: '#edf2f2' }}>

      {/* ── Nav ───────────────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 glass-topbar flex items-center justify-between px-6 md:px-10"
        style={{ height: '64px' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: '#0d3d3d' }}
          >
            <ShieldCheck style={{ width: '15px', height: '15px', color: '#a7f3d0' }} />
          </div>
          <div>
            <span className="font-bold text-sm" style={{ color: '#0f2626', fontFamily: 'Manrope, sans-serif' }}>
              ImmuniWatch
            </span>
            <span
              className="text-[10px] ml-1.5 font-semibold"
              style={{ color: '#8da8a8', fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: '0.04em' }}
            >
              NIGERIA
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/submit"
            className="text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            style={{ color: '#4a6060' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#0d3d3d'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#4a6060'; }}
          >
            Report
          </Link>
          <Link to="/login" className="btn-primary text-sm font-semibold px-4 py-2 rounded-xl">
            Sign In
          </Link>
        </div>
      </nav>

      {/* ── Hero (dark emerald) ────────────────────────────────────────────────── */}
      <section
        className="px-6 md:px-10 pt-16 pb-14 text-center"
        style={{
          background: 'linear-gradient(135deg, #0d3d3d 0%, #082828 65%, #051a1a 100%)',
          boxShadow: '0 8px 40px rgba(8,40,40,0.30)',
        }}
      >
        <div className="max-w-3xl mx-auto">
          {/* Live badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(0,137,123,0.18)', border: '1px solid rgba(0,137,123,0.28)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: '#a7f3d0' }} />
            <span
              className="text-[11px] font-bold"
              style={{ color: '#a7f3d0', fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: '0.06em' }}
            >
              LIVE SURVEILLANCE ACTIVE
            </span>
          </div>

          <h1
            className="text-3xl md:text-[2.75rem] font-bold text-white mb-4 leading-tight"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Protecting Nigeria's Public Health
            <br className="hidden md:block" />
            from Vaccine Misinformation
          </h1>

          <p
            className="text-base mb-8 max-w-lg mx-auto"
            style={{ color: 'rgba(255,255,255,0.58)', lineHeight: 1.75 }}
          >
            AI-powered surveillance across social media, news, and community channels — detecting
            harmful vaccine narratives in Hausa, Yoruba, English, and Pidgin before they spread.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/login"
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl"
            >
              Access Dashboard <ArrowRight style={{ width: '16px', height: '16px' }} />
            </Link>
            <Link
              to="/submit"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all"
              style={{
                background: 'rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.78)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.13)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
            >
              <FileText style={{ width: '16px', height: '16px' }} />
              Report Misinformation
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats strip ───────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 py-10">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Posts Monitored Daily', value: '120K+' },
            { label: 'Active Threat Clusters', value: '47'   },
            { label: 'Languages Covered',      value: '4'    },
            { label: 'Response Teams',         value: '12'   },
          ].map((stat) => (
            <div key={stat.label} className="stat-tile text-center">
              <p className="num-display text-2xl font-bold" style={{ color: '#0d3d3d' }}>{stat.value}</p>
              <p
                className="text-[11px] mt-1"
                style={{ color: '#8da8a8', fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: '0.02em' }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature tiles ─────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <p className="label-caps mb-2" style={{ color: '#8da8a8' }}>How It Works</p>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#0f2626', fontFamily: 'Manrope, sans-serif' }}>
              Multi-Layer Intelligence
            </h2>
            <p className="text-sm" style={{ color: '#4a6060' }}>
              From raw social-media signal to actionable public health response
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                Icon: Radio,
                accentColor: '#F4A261',
                accentBg:    'rgba(244,162,97,0.10)',
                accentBdr:   'rgba(244,162,97,0.22)',
                title: 'Real-Time Detection',
                body:  'Continuous ingestion from Twitter, Facebook, WhatsApp channels, and Nigerian news portals — flagging vaccine misinformation the moment it appears.',
              },
              {
                Icon: Brain,
                accentColor: '#5BA4CF',
                accentBg:    'rgba(91,164,207,0.10)',
                accentBdr:   'rgba(91,164,207,0.22)',
                title: 'AI-Powered Analysis',
                body:  'Multilingual NLP models trained on Nigerian vaccine narratives in English, Hausa, Yoruba, and Igbo/Pidgin — achieving >84% macro-F1 accuracy.',
              },
              {
                Icon: Globe,
                accentColor: '#B08BBF',
                accentBg:    'rgba(176,139,191,0.10)',
                accentBdr:   'rgba(176,139,191,0.22)',
                title: 'Geo-Surge Mapping',
                body:  'LGA-level surge tracking identifies where misinformation is spreading fastest, enabling targeted rapid-response campaigns where they\'re needed most.',
              },
            ].map(({ Icon, accentColor, accentBg, accentBdr, title, body }) => (
              <div key={title} className="glass-card p-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: accentBg, border: `1px solid ${accentBdr}` }}
                >
                  <Icon style={{ width: '18px', height: '18px', color: accentColor }} />
                </div>
                <h3 className="text-sm font-bold mb-2" style={{ color: '#0f2626', fontFamily: 'Manrope, sans-serif' }}>
                  {title}
                </h3>
                <p className="text-[13px] leading-relaxed" style={{ color: '#4a6060' }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── "For health teams" panel ──────────────────────────────────────────── */}
      <section className="px-6 md:px-10 pb-12">
        <div className="max-w-4xl mx-auto glass-elevated p-8">
          <div className="flex flex-col md:flex-row items-start gap-8">
            <div className="flex-1">
              <p className="label-caps mb-2" style={{ color: '#8da8a8' }}>For Health Professionals</p>
              <h2 className="text-xl font-bold mb-3" style={{ color: '#0f2626', fontFamily: 'Manrope, sans-serif' }}>
                Built for Nigeria's Public Health Teams
              </h2>
              <p className="text-sm mb-5" style={{ color: '#4a6060', lineHeight: 1.75 }}>
                State epidemiologists, NPHCDA communication officers, and LGA health supervisors use
                ImmuniWatch to monitor, respond to, and counter vaccine misinformation in near-real time.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                {[
                  'Human-in-the-loop review queues',
                  'Pre-approved response templates',
                  'Escalation to NCDC and NPHCDA',
                  'Multi-organisation coordination',
                  'Multilingual narrative tracking',
                  'Real-time model health monitoring',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle style={{ width: '13px', height: '13px', color: '#00897b', flexShrink: 0 }} />
                    <span className="text-xs" style={{ color: '#4a6060' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 self-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(0,137,123,0.08)', border: '1px solid rgba(0,137,123,0.16)' }}
              >
                <Users style={{ width: '32px', height: '32px', color: '#00897b' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Public report CTA ─────────────────────────────────────────────────── */}
      <section className="px-6 md:px-10 pb-16">
        <div
          className="max-w-4xl mx-auto glass-card text-center p-10"
          style={{ background: 'linear-gradient(135deg, rgba(0,137,123,0.07), rgba(13,61,61,0.03))' }}
        >
          <h2 className="text-xl font-bold mb-2" style={{ color: '#0f2626', fontFamily: 'Manrope, sans-serif' }}>
            Seen vaccine misinformation?
          </h2>
          <p className="text-sm mb-6" style={{ color: '#4a6060' }}>
            Anyone can submit a report — no account required. Health teams review every submission.
          </p>
          <Link
            to="/submit"
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl"
          >
            <FileText style={{ width: '16px', height: '16px' }} />
            Submit a Report
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────────── */}
      <footer className="px-6 md:px-10 py-6" style={{ borderTop: '1px solid rgba(13,61,61,0.08)' }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck style={{ width: '13px', height: '13px', color: '#8da8a8' }} />
            <span className="text-xs" style={{ color: '#8da8a8' }}>ImmuniWatch Nigeria — Vital Intel Suite</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-xs transition-colors"
              style={{ color: '#8da8a8' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#4a6060'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8da8a8'; }}
            >
              Sign In
            </Link>
            <Link
              to="/submit"
              className="text-xs transition-colors"
              style={{ color: '#8da8a8' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#4a6060'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8da8a8'; }}
            >
              Report Misinformation
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
