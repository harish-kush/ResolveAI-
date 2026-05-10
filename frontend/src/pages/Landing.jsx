import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { Zap, MessageSquare, BarChart3, Shield, Bot, Users, ArrowRight, Star, Globe, Layers, Clock } from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

export default function Landing() {
  const heroRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.hero-title', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' });
      gsap.fromTo('.hero-sub', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, delay: 0.3, ease: 'power3.out' });
      gsap.fromTo('.hero-cta', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.6, ease: 'power3.out' });
      gsap.fromTo('.hero-visual', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.2, delay: 0.4, ease: 'power2.out' });
      gsap.to('.orb-1', { y: -30, x: 20, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.orb-2', { y: 20, x: -30, duration: 5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.orb-3', { y: -20, x: -10, duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  const features = [
    { icon: Bot, title: 'AI-Powered Chatbot', desc: 'Intelligent chatbot trained on your data that handles customer queries 24/7 with human-like accuracy.' },
    { icon: MessageSquare, title: 'Real-time Chat', desc: 'Seamless live chat with typing indicators, read receipts, and instant message delivery.' },
    { icon: Layers, title: 'Ticket Management', desc: 'Centralized ticketing system with auto-assignment, prioritization, and AI-generated summaries.' },
    { icon: BarChart3, title: 'Smart Analytics', desc: 'Deep insights into response times, customer satisfaction, AI accuracy, and team performance.' },
    { icon: Globe, title: 'Knowledge Base', desc: 'Train your AI with FAQs, documents, and website content for context-aware responses.' },
    { icon: Shield, title: 'Enterprise Security', desc: 'JWT authentication, rate limiting, input validation, and multi-tenant data isolation.' }
  ];

  const workflow = [
    { step: '01', title: 'Connect', desc: 'Add a single script tag to embed the AI chatbot widget on your website.' },
    { step: '02', title: 'Train', desc: 'Upload FAQs, crawl your website, or connect Notion to train the AI on your data.' },
    { step: '03', title: 'Automate', desc: 'AI handles customer queries instantly. Complex issues are escalated to human agents.' },
    { step: '04', title: 'Optimize', desc: 'Track analytics, improve responses, and continuously enhance customer satisfaction.' }
  ];



  const testimonials = [
    { name: 'Sarah Chen', role: 'Head of Support, TechFlow', text: 'ResolveAI reduced our response time by 80%. The AI handles routine queries perfectly, letting our team focus on complex issues.', rating: 5 },
    { name: 'Marcus Johnson', role: 'CEO, StartupGrid', text: 'We went from losing customers due to slow support to having a 98% satisfaction rate. The ROI is incredible.', rating: 5 },
    { name: 'Emily Rodriguez', role: 'CTO, DataPulse', text: 'The knowledge base training is brilliant. Our AI chatbot answers questions as accurately as our best support agents.', rating: 5 }
  ];

  return (
    <div ref={heroRef} style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <nav style={{ position: 'fixed', top: 0, width: '100%', zIndex: 50, padding: '16px 0' }} className="glass">
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} color="white" />
            </div>
            <span style={{ fontSize: 22, fontWeight: 800 }} className="gradient-text">ResolveAI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link to="/login" className="btn-secondary" style={{ padding: '10px 20px', fontSize: 13 }}>Sign In</Link>
            <Link to="/register" className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>Get Started <ArrowRight size={14} /></Link>
          </div>
        </div>
      </nav>

      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 100, overflow: 'hidden' }}>
        <div className="orb-1" style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)', top: -100, right: -100 }} />
        <div className="orb-2" style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', bottom: -50, left: -100 }} />
        <div className="orb-3" style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative' }}>
          <div className="hero-title" style={{ opacity: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 100, border: '1px solid var(--border)', background: 'var(--bg-card)', marginBottom: 32, fontSize: 13, color: 'var(--text-secondary)' }}>
              <Zap size={14} style={{ color: 'var(--warning)' }} /> AI-Powered Customer Support Platform
            </div>
            <h1 style={{ fontSize: 'clamp(36px, 5vw, 72px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.02em' }}>
              Resolve Customer Issues <br />
              <span className="gradient-text">Before They Escalate</span>
            </h1>
          </div>
          <p className="hero-sub" style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto 40px', lineHeight: 1.7, opacity: 0 }}>
            Deploy an AI chatbot trained on your data, manage tickets efficiently, and deliver instant support that delights customers and scales with your business.
          </p>
          <div className="hero-cta" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', opacity: 0 }}>
            <Link to="/register" className="btn-primary" style={{ padding: '16px 36px', fontSize: 16, borderRadius: 14 }}>
              Get Started — It's Free <ArrowRight size={18} />
            </Link>
            <a href="#features" className="btn-secondary" style={{ padding: '16px 36px', fontSize: 16, borderRadius: 14 }}>
              See How It Works
            </a>
          </div>

          <div className="hero-visual" style={{ marginTop: 80, opacity: 0 }}>
            <div style={{ maxWidth: 900, margin: '0 auto', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden', boxShadow: '0 20px 80px rgba(0,0,0,0.3)' }}>
              <div style={{ padding: 12, borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#EF4444' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#F59E0B' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10B981' }} />
              </div>
              <div style={{ padding: 32, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                {[
                  { label: 'Tickets Resolved', value: '2,847', change: '+23%', color: 'var(--success)' },
                  { label: 'Avg Response Time', value: '< 30s', change: '-65%', color: 'var(--info)' },
                  { label: 'Customer Satisfaction', value: '4.9/5', change: '+12%', color: 'var(--warning)' }
                ].map((stat, i) => (
                  <div key={i} style={{ background: 'var(--bg-tertiary)', borderRadius: 14, padding: 20, textAlign: 'left' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{stat.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: stat.color, fontWeight: 600 }}>{stat.change} this month</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '60px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 40, textAlign: 'center' }}>
            {[
              { value: '50K+', label: 'Tickets Resolved' },
              { value: '99.9%', label: 'Uptime SLA' },
              { value: '<30s', label: 'Avg AI Response' },
              { value: '4.9★', label: 'Customer Rating' }
            ].map((stat, i) => (
              <motion.div key={i} variants={fadeUp}>
                <div style={{ fontSize: 36, fontWeight: 800 }} className="gradient-text">{stat.value}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section style={{ padding: '100px 0', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>The Problem</h2>
            <h3 style={{ fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 800, marginBottom: 20 }}>Customer Support Is <span className="gradient-text">Broken</span></h3>
            <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
              68% of customers leave because of slow responses. Scattered queries, overwhelmed teams, and no AI—it's time for a change.
            </p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            {[
              { icon: Clock, title: 'Slow Responses', desc: 'Customers wait hours or days for simple answers that AI could resolve in seconds.' },
              { icon: Globe, title: 'Scattered Queries', desc: 'Support requests come from email, chat, forms—impossible to track without a central system.' },
              { icon: Users, title: 'Overwhelmed Teams', desc: 'Support agents burn out handling repetitive queries that should be automated.' },
              { icon: ArrowRight, title: 'Lost Customers', desc: 'Visitors leave your website when they can\'t find answers quickly enough.' }
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} className="card" style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <item.icon size={22} style={{ color: 'var(--danger)' }} />
                </div>
                <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{item.title}</h4>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="features" style={{ padding: '100px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>Features</h2>
            <h3 style={{ fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 800, marginBottom: 20 }}>Everything You Need to <span className="gradient-text">Delight Customers</span></h3>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {features.map((f, i) => (
              <motion.div key={i} variants={fadeUp} className="card" style={{ padding: 32 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(124,58,237,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <f.icon size={24} style={{ color: 'var(--primary-light)' }} />
                </div>
                <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{f.title}</h4>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section style={{ padding: '100px 0', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>How It Works</h2>
            <h3 style={{ fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 800 }}>AI Support in <span className="gradient-text">4 Simple Steps</span></h3>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {workflow.map((w, i) => (
              <motion.div key={i} variants={fadeUp} style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 48, fontWeight: 900, marginBottom: 16, opacity: 0.15 }}>{w.step}</div>
                <h4 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }} className="gradient-text">{w.title}</h4>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{w.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>



      <section style={{ padding: '100px 0', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>Testimonials</h2>
            <h3 style={{ fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 800 }}>Loved by <span className="gradient-text">Support Teams</span></h3>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {testimonials.map((t, i) => (
              <motion.div key={i} variants={fadeUp} className="card" style={{ padding: 32 }}>
                <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
                  {Array(t.rating).fill(0).map((_, j) => <Star key={j} size={16} fill="#F59E0B" color="#F59E0B" />)}
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>"{t.text}"</p>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.role}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section style={{ padding: '100px 0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, marginBottom: 20, lineHeight: 1.2 }}>
              Ready to Transform Your <span className="gradient-text">Customer Support?</span>
            </h2>
            <p style={{ fontSize: 18, color: 'var(--text-secondary)', marginBottom: 40, lineHeight: 1.7 }}>
              Join thousands of businesses using ResolveAI to deliver instant, intelligent support.
            </p>
            <Link to="/register" className="btn-primary" style={{ padding: '18px 48px', fontSize: 17, borderRadius: 14 }}>
              Get Started Free <ArrowRight size={20} />
            </Link>
          </motion.div>
        </div>
      </section>

      <footer style={{ padding: '40px 0', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} style={{ color: 'var(--primary-light)' }} />
            <span style={{ fontWeight: 700, fontSize: 16 }} className="gradient-text">ResolveAI</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>© 2026 ResolveAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
