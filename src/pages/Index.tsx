import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { Campaign } from '@/types/campaign';
import CampaignCard from '@/components/CampaignCard';
import Header from '@/components/Header';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { calculateProgress, checkCampaignVerification } from '@/utils/contractUtils';

const Index = () => {
  const { address, isConnected, connectWallet } = useWeb3();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      // Fetch campaigns from Supabase
      const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaigns:', error);
        return;
      }

      // Process each campaign
      const processedCampaigns = await Promise.all(campaignsData.map(async (campaignData) => {
        // Fetch verification votes for this campaign
        const { data: verificationVotes } = await supabase
          .from('campaign_verifications')
          .select('is_verified')
          .eq('campaign_id', campaignData.id);
          
        // Determine verification status based on votes
        const shouldBeVerified = checkCampaignVerification(verificationVotes || []);
        
        // Fetch creator profile
        const { data: creatorProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', campaignData.creator_id)
          .single();
        
        // Fetch donations
        const { data: donations } = await supabase
          .from('donations')
          .select('donor_id, amount')
          .eq('campaign_id', campaignData.id);
          
        // Calculate total amount collected to ensure it's up to date
        let totalCollected = 0;
        if (donations && donations.length > 0) {
          totalCollected = donations.reduce((sum, donation) => sum + parseFloat(donation.amount.toString()), 0);
          
          // Update the database if there's a discrepancy
          if (totalCollected !== campaignData.amount_collected) {
            await supabase
              .from('campaigns')
              .update({ amount_collected: totalCollected })
              .eq('id', campaignData.id);
              
            campaignData.amount_collected = totalCollected;
          }
        }
        
        // Format campaign with accurate information
        return {
          id: campaignData.id,
          originalId: campaignData.id.toString(),
          owner: campaignData.creator_id,
          title: campaignData.title,
          description: campaignData.description,
          target: campaignData.target_amount.toString(),
          deadline: new Date(campaignData.deadline).getTime() / 1000,
          amountCollected: campaignData.amount_collected.toString(),
          image: campaignData.image_url || '',
          documents: campaignData.documents || [],
          videos: campaignData.videos || [],
          donors: donations ? donations.map(d => d.donor_id) : [],
          donations: donations ? donations.map(d => d.amount.toString()) : [],
          isVerified: campaignData.is_verified || shouldBeVerified,
          isCompleted: parseFloat(campaignData.amount_collected.toString()) >= parseFloat(campaignData.target_amount.toString()) || 
                       new Date(campaignData.deadline).getTime() / 1000 < Math.floor(Date.now() / 1000),
          creatorName: creatorProfile?.display_name || ''
        };
      }));

      setCampaigns(processedCampaigns);
    } catch (err) {
      console.error('Error processing campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8dfec] to-[#c6afd0] dark:bg-gradient-to-br dark:from-[#1a1320] dark:to-[#131320]">      
    <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search campaigns..."
            className="w-full px-4 py-2 border border-accent-200 rounded-md focus:outline-none bg-secondary-100 text-text focus:ring focus:border-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-48 ">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ">
            {filteredCampaigns.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;