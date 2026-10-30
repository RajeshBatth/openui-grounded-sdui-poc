import { createContext, useContext } from "react";

// Lets any view send a follow-up message, independent of which variant rendered it.
export const AskContext = createContext<(message: string) => void>(() => {});
export const useAsk = () => useContext(AskContext);
