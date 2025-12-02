import React from "react";
import { User } from "@supabase/supabase-js";

export const UserContext = React.createContext<{
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}>({
  user: null,
  setUser: () => null,
});
