'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';

import { getCurrentUser } from '@/services/api/authService';
import { getToken } from '@/services/api/tokenStore';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
};

type AuthAction =
  | { type: 'SET_USER'; payload: AuthUser | null }
  | { type: 'SET_LOADING'; payload: boolean };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

const AuthStateContext = createContext<AuthState | null>(null);
const AuthDispatchContext = createContext<Dispatch<AuthAction> | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuthState() {
      if (!getToken()) {
        if (isMounted) {
          dispatch({ type: 'SET_USER', payload: null });
          dispatch({ type: 'SET_LOADING', payload: false });
        }
        return;
      }

      const user = await getCurrentUser();

      if (!isMounted) {
        return;
      }

      dispatch({ type: 'SET_USER', payload: user });
      dispatch({ type: 'SET_LOADING', payload: false });
    }

    void bootstrapAuthState();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AuthStateContext.Provider value={state}>
      <AuthDispatchContext.Provider value={dispatch}>
        {children}
      </AuthDispatchContext.Provider>
    </AuthStateContext.Provider>
  );
}

export function useAuthState(): AuthState {
  const ctx = useContext(AuthStateContext);
  if (!ctx) throw new Error('useAuthState must be used within AuthProvider');
  return ctx;
}

export function useAuthDispatch(): Dispatch<AuthAction> {
  const ctx = useContext(AuthDispatchContext);
  if (!ctx) throw new Error('useAuthDispatch must be used within AuthProvider');
  return ctx;
}

export function useAuth(): AuthState & { dispatch: Dispatch<AuthAction> } {
  return { ...useAuthState(), dispatch: useAuthDispatch() };
}
