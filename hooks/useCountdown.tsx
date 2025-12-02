
import { useEffect, useState } from "react";

export const useCountdown = (initialSeconds: number = 0) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(initialSeconds > 0);
  
  useEffect(() => {
    // Reset and activate countdown when initial seconds change
    if (initialSeconds > 0) {
      setSeconds(initialSeconds);
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  }, [initialSeconds]);
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((currentSeconds) => {
          const newSeconds = currentSeconds - 1;
          if (newSeconds <= 0) {
            setIsActive(false);
            return 0;
          }
          return newSeconds;
        });
      }, 1000);
    } else if (seconds <= 0) {
      setIsActive(false);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, seconds]);
  
  return { seconds, isActive, setSeconds, setIsActive };
};
