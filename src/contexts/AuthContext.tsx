"use client"

import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { userHasWallet } from "@civic/auth-web3";
import { useUser } from "@civic/auth-web3/react";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: any | null;
  wallets: any[] | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshWallets: () => Promise<void>;
  addWallet: (address: string, name?: string) => Promise<void>;
  setWalletAsPrimary: (walletId: string) => Promise<void>;
  removeWallet: (walletId: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [wallets, setWallets] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch profile and wallets when session changes
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchWallets(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setWallets(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchWallets(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error("Error fetching profile:", error.message);
    }
  };

  const fetchWallets = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .order("is_primary", { ascending: false });

      if (error) throw error;
      setWallets(data || []);
    } catch (error: any) {
      console.error("Error fetching wallets:", error.message);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    await fetchProfile(user.id);
  };

  const refreshWallets = async () => {
    if (!user) return;
    await fetchWallets(user.id);
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Authentication error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Sign out error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addWallet = async (address: string, name?: string) => {
    if (!user) return;
    
    try {
      // Check if this is the first wallet (make it primary)
      const isPrimary = !wallets || wallets.length === 0;
      
      const { error } = await supabase
        .from("wallets")
        .insert({
          user_id: user.id,
          address,
          name: name || `Wallet ${wallets?.length ? wallets.length + 1 : 1}`,
          is_primary: isPrimary,
        });

      if (error) throw error;
      
      toast({
        title: "Wallet added",
        description: "Your wallet has been added successfully.",
      });
      
      await refreshWallets();
    } catch (error: any) {
      toast({
        title: "Error adding wallet",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const setWalletAsPrimary = async (walletId: string) => {
    if (!user) return;
    
    try {
      // Begin by setting all wallets to non-primary
      await supabase
        .from("wallets")
        .update({ is_primary: false })
        .eq("user_id", user.id);
      
      // Then set the selected wallet as primary
      const { error } = await supabase
        .from("wallets")
        .update({ is_primary: true })
        .eq("id", walletId);

      if (error) throw error;
      
      toast({
        title: "Primary wallet updated",
        description: "Your primary wallet has been updated.",
      });
      
      await refreshWallets();
    } catch (error: any) {
      toast({
        title: "Error updating wallet",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeWallet = async (walletId: string) => {
    if (!user) return;
    
    try {
      // Check if removing a primary wallet
      const walletToRemove = wallets?.find(w => w.id === walletId);
      const isPrimary = walletToRemove?.is_primary;
      
      // Delete the wallet
      const { error } = await supabase
        .from("wallets")
        .delete()
        .eq("id", walletId);

      if (error) throw error;
      
      // If we removed the primary wallet and there are other wallets, make the first one primary
      if (isPrimary && wallets && wallets.length > 1) {
        const nextWallet = wallets.find(w => w.id !== walletId);
        if (nextWallet) {
          await supabase
            .from("wallets")
            .update({ is_primary: true })
            .eq("id", nextWallet.id);
        }
      }
      
      toast({
        title: "Wallet removed",
        description: "Your wallet has been removed successfully.",
      });
      
      await refreshWallets();
    } catch (error: any) {
      toast({
        title: "Error removing wallet",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      profile,
      wallets,
      loading,
      signInWithGoogle,
      signOut,
      refreshProfile,
      refreshWallets,
      addWallet,
      setWalletAsPrimary,
      removeWallet
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
