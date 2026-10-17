import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { ACCOUNTS_ENABLED, AccountInfo, api, MeResponse, Usage } from "@/lib/api";

interface AccountContextValue {
  enabled: boolean;
  loading: boolean;
  account: AccountInfo | null;
  usage: Usage | null;
  refresh: () => Promise<void>;
  setUsage: (usage: Usage) => void;
  setAccount: (account: AccountInfo | null) => void;
  logout: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(ACCOUNTS_ENABLED);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

  const refresh = useCallback(async () => {
    if (!ACCOUNTS_ENABLED) return;
    try {
      const me = await api<MeResponse>("/api/me");
      setAccount(me.account);
      setUsage(me.usage);
    } catch {
      // The page still works; the header just shows no account.
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST", body: {} }).catch(() => undefined);
    setAccount(null);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AccountContext.Provider
      value={{ enabled: ACCOUNTS_ENABLED, loading, account, usage, refresh, setUsage, setAccount, logout }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount must be used inside AccountProvider");
  return value;
}
