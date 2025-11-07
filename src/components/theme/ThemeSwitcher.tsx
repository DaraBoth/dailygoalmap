import { useTheme } from "@/hooks/use-theme";
import { motion } from "framer-motion";
import { Sun, Moon, Laptop } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

export const ThemeSegmentSwitch = () => {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [hovered, setHovered] = useState<string | null>(null);

    const modes = [
        { id: "light", icon: <Sun className="h-4 w-4 text-yellow-400" />, label: "Light" },
        { id: "system", icon: <Laptop className="h-4 w-4 text-blue-400" />, label: "System" },
        { id: "dark", icon: <Moon className="h-4 w-4 text-indigo-400" />, label: "Dark" },
    ];

    const current = hovered || theme;

    const leftPosition = useMemo(() => {
        switch (current) {
            case "light":
                return "0%";
            case "system":
                return "33.3333%";
            case "dark":
                return "66.6666%";
            default:
                return "0%";
        }
    }, [current]);

    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    return (
        <div
            className="relative flex rounded-lg overflow-hidden mt-1 liquid-glass-button"
            style={{ width: "100%", height: "35px" }}
        >

            {/* 🟦 Animated “liquid glass” layer */}
            <motion.div
                layout
                animate={{ left: leftPosition }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="absolute top-0 bottom-0 w-1/3 liquid-glass-switch pointer-events-none"
            />

            {/* Buttons */}
            {modes.map((mode) => {
                const isActive = hovered ? hovered === mode.id : theme === mode.id;
                return (
                    <button
                        key={mode.id}
                        type="button"
                        onMouseEnter={() => setHovered(mode.id)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={(e) => {
                            e.stopPropagation();
                            setTheme(mode.id as any);
                        }}
                        className={`relative z-10 p-2 flex flex-col items-center justify-center flex-1 
              transition-all duration-300 ease-out text-foreground h-8
              ${isActive ? "" : ""}
            `}
                    >
                        {mode.icon}
                        {/* <span className="text-xs font-semibold  mt-1">{mode.label}</span> */}
                    </button>
                );
            })}
        </div>
    );
};
