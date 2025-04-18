import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '@/context/Web3Context';
import { Campaign } from '@/types/campaign';
import { formatCampaign, calculateProgress, formatEthAmount, calculateTimeRemaining, truncateAddress } from '@/utils/contractUtils';
import Header from '@/components/Header';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  CheckCircle, 
  File, 
  Users, 
  Wallet, 
  Clock, 
  AlertCircle,
  Loader2,
  Video,
  Link as LinkIcon,
  Share2,
  User
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { contract, address, isConnected, connectWallet, isVerifiedCreator } = useWeb3();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [donationAmount, setDonationAmount] = useState<string>('0.1');
  const [donating, setDonating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState<string>('');
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [realTimeProgress, setRealTimeProgress] = useState<number>(0);
  const [realTimeAmountCollected, setRealTimeAmountCollected] = useState<string>('0');
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchCampaignDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!id) {
        setError('Campaign ID not found');
        setLoading(false);
        return;
      }
      
      console.log(`Fetching campaign details for ID: ${id}`);
      
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();
      
      if (campaignError) {
        console.error('Error fetching campaign from Supabase:', campaignError);
        setError('Failed to load campaign details');
        setLoading(false);
        return;
      }
      
      if (!campaignData) {
        console.error('Campaign not found in Supabase');
        setError('Campaign not found');
        setLoading(false);
        return;
      }
      
      console.log('Campaign data from Supabase:', campaignData);
      
      const { data: creatorProfile, error: creatorError } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', campaignData.creator_id)
        .single();
        
      let creatorDisplayName = truncateAddress(campaignData.creator_id);
      if (!creatorError && creatorProfile && creatorProfile.display_name) {
        creatorDisplayName = creatorProfile.display_name;
      }
      
      setCreatorName(creatorDisplayName);
      
      const { data: donationsData, error: donationsError } = await supabase
        .from('donations')
        .select('donor_id, amount')
        .eq('campaign_id', id);
      
      if (donationsError) {
        console.warn('Error fetching donations:', donationsError);
      }

      let totalCollected = 0;
      if (donationsData && donationsData.length > 0) {
        totalCollected = donationsData.reduce((sum, donation) => sum + parseFloat(donation.amount.toString()), 0);
      }
      
      if (totalCollected !== parseFloat(campaignData.amount_collected)) {
        console.log(`Updating amount_collected from ${campaignData.amount_collected} to ${totalCollected}`);
        
        try {
          const { error: updateError } = await supabase
            .from('campaigns')
            .update({ amount_collected: totalCollected })
            .eq('id', id);
            
          if (updateError) {
            console.error('Error updating campaign amount:', updateError);
          } else {
            campaignData.amount_collected = totalCollected;
          }
        } catch (updateErr) {
          console.error('Failed to update campaign amount:', updateErr);
        }
      }
      
      const formattedCampaign: Campaign = {
        id: parseInt(id),
        owner: campaignData.creator_id,
        title: campaignData.title,
        description: campaignData.description,
        target: campaignData.target_amount.toString(),
        deadline: new Date(campaignData.deadline).getTime() / 1000,
        amountCollected: campaignData.amount_collected.toString(),
        image: campaignData.image_url || '',
        documents: campaignData.documents || [],
        videos: campaignData.videos || [],
        donors: donationsData ? donationsData.map(d => d.donor_id) : [],
        donations: donationsData ? donationsData.map(d => d.amount.toString()) : [],
        isVerified: campaignData.is_verified || false,
        isCompleted: parseFloat(campaignData.amount_collected.toString()) >= parseFloat(campaignData.target_amount.toString()) || 
                     new Date(campaignData.deadline).getTime() / 1000 < Math.floor(Date.now() / 1000),
        creatorName: creatorDisplayName
      };
      
      setCampaign(formattedCampaign);
      setRealTimeAmountCollected(formattedCampaign.amountCollected);
      setRealTimeProgress(calculateProgress(formattedCampaign.amountCollected, formattedCampaign.target));

      if (address) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData && userData.user) {
          const { data: verificationData } = await supabase
            .from('campaign_verifications')
            .select('*')
            .eq('campaign_id', id)
            .eq('voter_id', userData.user.id);
          
          setHasVoted(verificationData && verificationData.length > 0);
        }
      }
    } catch (error: any) {
      console.error('Error in fetchCampaignDetails:', error);
      setError('Failed to load campaign details');
      toast({
        title: 'Error',
        description: 'There was a problem loading the campaign details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // ... rest of the component code remains unchanged
};
