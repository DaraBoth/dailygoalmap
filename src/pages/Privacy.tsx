import React from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { motion } from "framer-motion";
import LogoAvatar from "@/components/ui/LogoAvatar";
import GlobalBackground from "@/components/ui/GlobalBackground";

const Privacy: React.FC = () => {
    return (
        <>
            <title>Privacy Protocols | Orbit</title>
            <div className="relative min-h-screen text-foreground selection:bg-primary/30">
                <GlobalBackground />

                <header className="relative z-10 p-6">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <SmartLink to="/">
                            <Button variant="ghost" className="hover:bg-primary/10 hover:text-primary rounded-xl font-bold transition-all">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Home
                            </Button>
                        </SmartLink>
                        <div className="flex items-center gap-3">
                            <LogoAvatar size={32} />
                            <span className="font-black text-xl tracking-tighter">Orbit</span>
                        </div>
                    </div>
                </header>

                <main className="relative z-10 max-w-4xl mx-auto px-6 py-20">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="space-y-12"
                    >
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                                Data Sovereignty
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
                                Privacy <span className="text-primary italic">Protocols</span>
                            </h1>
                            <p className="text-xl text-muted-foreground font-medium">
                                Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>

                        <div className="grid gap-12">
                            <section className="p-8 rounded-[2.5rem] glass-card border border-foreground/5 bg-background/40 backdrop-blur-xl space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-2xl ring-1 ring-primary/20">
                                        <Shield className="h-6 w-6 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tight">System Integrity</h2>
                                </div>
                                <div className="space-y-4 text-muted-foreground font-medium leading-relaxed">
                                    <p>
                                        Orbit is engineered with absolute privacy at its core. We do not sell your data. We do not track your movement across the web. Our mission is your achievement, not your surveillance.
                                    </p>
                                    <p>
                                        We collect only the minimum necessary information to provide our autonomous intelligence services: your email for authentication and the data you explicitly provide to help track your goals.
                                    </p>
                                </div>
                            </section>

                            <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground font-medium">
                                <section>
                                    <h3 className="text-xl font-black text-foreground uppercase tracking-widest text-xs mb-4">01. Data Collection</h3>
                                    <p>Encryption-grade security is applied to all sensitive information. Your trajectory data is stored securely and is only accessible by you and the systems you authorize.</p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-black text-foreground uppercase tracking-widest text-xs mb-4">02. Autonomous Intelligence</h3>
                                    <p>Our AI models process your content to provide actionable insights. This data is used solely to improve your personal experience within the Orbit ecosystem.</p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-black text-foreground uppercase tracking-widest text-xs mb-4">03. User Control</h3>
                                    <p>You maintain 100% sovereignty over your data. You can export, modify, or terminate your account and all associated mission logs at any time.</p>
                                </section>
                            </div>
                        </div>
                    </motion.div>
                </main>
            </div>
        </>
    );
};

export default Privacy;
