import { useState } from 'react';
import './EnterpriseTab.css';

export function EnterpriseTab() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, this would send a request to the backend
        // For now, we simulate a successful submission
        const mailtoLink = `mailto:sales@yigcore.ai?subject=Inquiry about Yigcore Core&body=I am interested in: Multi-Agent Orchestration. My email: ${email}`;
        window.open(mailtoLink, '_blank');
        setSubmitted(true);
    };

    return (
        <div className="enterprise-tab">
            <div className="hero-section">
                <h2>🚀 Scale Up to Yigcore Core</h2>
                <p>Sentinel is great for single agents. Need more?</p>
            </div>

            <div className="features-grid">
                <div className="feature-card">
                    <div className="icon">🤖</div>
                    <h3>Multi-Agent Orchestration</h3>
                    <p>Coordinate unlimited agents with complex dependencies and workflows.</p>
                </div>
                <div className="feature-card">
                    <div className="icon">📈</div>
                    <h3>Bandit Router</h3>
                    <p>Save 20%+ on LLM costs with our UCB1 adaptive model router.</p>
                </div>
                <div className="feature-card">
                    <div className="icon">🕸️</div>
                    <h3>DAG Analytics</h3>
                    <p>Visualize bottlenecks in your agent chains and optimize latency.</p>
                </div>
                <div className="feature-card">
                    <div className="icon">🔒</div>
                    <h3>Enterprise Security</h3>
                    <p>SSO, RBAC, and SOC2 compliance features for large teams.</p>
                </div>
            </div>

            <div className="cta-section">
                <h3>Ready to upgrade?</h3>
                {submitted ? (
                    <div className="success-message">
                        Thanks! We'll be in touch shortly.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="contact-form">
                        <input
                            type="email"
                            placeholder="Enter your work email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <button type="submit" className="cta-button">
                            Request Demo
                        </button>
                    </form>
                )}
                <p className="subtext">
                    Targeting 3+ agents? <a href="https://yigcore.ai/contact" target="_blank" rel="noreferrer">Talk to an architect</a>
                </p>
            </div>
        </div>
    );
}
