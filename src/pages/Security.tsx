import React from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, Lock, Cpu } from "lucide-react";
import { motion } from "framer-motion";
import LogoAvatar from "@/components/ui/LogoAvatar";
import GlobalBackground from "@/components/ui/GlobalBackground";

const Security: React.FC = () => {
    return (
        <>
            <title>Security Ops | Orbit</title>
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
                                Station Defense
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
                                Security <span className="text-primary italic">Ops</span>
                            </h1>
                            <p className="text-xl text-muted-foreground font-medium">
                                Protecting your trajectory through advanced encryption.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {[
                                {
                                    icon: Lock,
                                    title: "Encrypted Core",
                                    desc: "All mission data is encrypted at rest and in transit using industry-standard AES-256 protocols."
                                },
                                {
                                    icon: ShieldCheck,
                                    title: "Verified Access",
                                    desc: "Secure authentication powered by Supabase Auth, ensuring only verified commanders access their mission logs."
                                },
                                {
                                    icon: Cpu,
                                    title: "Neural Safety",
                                    desc: "AI-driven anomaly detection to prevent unauthorized access and maintain system equilibrium."
                                }
                            ].map((op, i) => (
                                <div key={i} className="p-8 rounded-[2.5rem] glass-card border border-foreground/5 bg-background/40 backdrop-blur-xl space-y-4">
                                    <div className="p-3 bg-primary/10 rounded-2xl ring-1 ring-primary/20 w-fit">
                                        <op.icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tight">{op.title}</h2>
                                    <p className="text-muted-foreground font-medium leading-relaxed">{op.desc}</p>
                                </div>
                            ))}
                        </div>

                        <section className="p-12 rounded-[3.5rem] bg-foreground text-background space-y-8">
                            <h2 className="text-3xl font-black tracking-tighter uppercase">Our Commitment</h2>
                            <p className="text-lg font-bold opacity-80 leading-relaxed max-w-2xl">
                                We treat your data with the same precision as a rocket launch. Every byte is accounted for, protected, and serving the sole purpose of your success.
                            </p>
                            <div className="pt-4 border-t border-background/10 text-[10px] font-black uppercase tracking-[0.3em]">
                                Verified Operational Status: 100%
                            </div>
                        </section>
                    </motion.div>
                </main>
            </div>
        </>
    );
};

export default Security;
