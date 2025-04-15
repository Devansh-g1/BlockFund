import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWeb3 } from './Web3Context';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Web3ContextExtendedProps {
  isVerifiedCreator: boolean;
  isSuperVerified: boolean;
  fetchCampaigns: () => Promise<any[]>;
  verifyCampaign: (campaignId: string) => Promise<void>;
  voteCampaign: (campaignId: string, isVerified: boolean) => Promise<void>;
}

const Web3ContextExtendedContext = createContext<Web3ContextExtendedProps | undefined>(undefined);

export const Web3ContextExtendedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address } = useWeb3();
  const { toast } = useToast();
  const [isVerifiedCreator, setIsVerifiedCreator] = useState(false);
  const [isSuperVerified, setIsSuperVerified] = useState(false);
  
  // Check if the user is a verified creator or super verified (@gov.in email)
  useEffect(() => {
    const checkUserVerification = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Check if the user has a gov.in email (super verified)
          const isSuperVerified = user.email?.endsWith('@gov.in') || false;
          setIsSuperVerified(isSuperVerified);
          
          // If super verified, they're automatically verified creators
          if (isSuperVerified) {
            setIsVerifiedCreator(true);
          } else {
            // Otherwise check their status in profiles
            const { data: profile } = await supabase
              .from('profiles')
              .select('is_admin')
              .eq('id', user.id)
              .single();
              
            setIsVerifiedCreator(profile?.is_admin || false);
          }
        }
      } catch (error) {
        console.error('Error checking user verification:', error);
      }
    };
    
    if (address) {
      checkUserVerification();
    } else {
      setIsVerifiedCreator(false);
      setIsSuperVerified(false);
    }
  }, [address]);
  
  // Fetch campaigns from Supabase
  const fetchCampaigns = async () => {
    try {
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return campaigns || [];
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }
  };
  
  // Verify a campaign (admin or super verified only)
  const verifyCampaign = async (campaignId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');
      
      if (!isSuperVerified) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
          
        if (!profile?.is_admin) throw new Error('Not authorized to verify campaigns');
      }
      
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          is_verified: true,
          verified_by: user.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', campaignId);
        
      if (error) throw error;
      
      toast({
        title: 'Campaign Verified',
        description: 'The campaign has been verified successfully.',
      });
    } catch (error: any) {
      console.error('Error verifying campaign:', error);
      toast({
        title: 'Verification Failed',
        description: error.message || 'Could not verify the campaign',
        variant: 'destructive'
      });
    }
  };
  
  // Vote for a campaign verification (by donors)
  const voteCampaign = async (campaignId: string, isVerified: boolean) => {
    try {
      // Implementation for donation-based voting would go here
      // For now, we'll just show a toast message
      toast({
        title: 'Vote Registered',
        description: `Your vote to ${isVerified ? 'verify' : 'reject'} this campaign has been registered.`,
      });
    } catch (error: any) {
      console.error('Error voting for campaign:', error);
      toast({
        title: 'Voting Failed',
        description: error.message || 'Could not register your vote',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <Web3ContextExtendedContext.Provider value={{
      isVerifiedCreator,
      isSuperVerified,
      fetchCampaigns,
      verifyCampaign,
      voteCampaign
    }}>
      {children}
    </Web3ContextExtendedContext.Provider>
  );
};

export const useWeb3Extended = () => {
  const context = useContext(Web3ContextExtendedContext);
  if (!context) {
    throw new Error('useWeb3Extended must be used within a Web3ContextExtendedProvider');
  }
  return context;
};
