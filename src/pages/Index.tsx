import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { Campaign } from '@/types/campaign';
import CampaignCard from '@/components/CampaignCard';
import Header from '@/components/Header';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaigns:', error);
      }

      if (data) {
        const formattedCampaigns = data.map(campaignData => formatCampaignFromSupabase(campaignData));
        setCampaigns(formattedCampaigns);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCampaignFromSupabase = (campaignData: any): Campaign => {
    return {
      id: campaignData.id,
      owner: campaignData.creator_id,
      title: campaignData.title,
      description: campaignData.description,
      target: campaignData.target_amount.toString(),
      deadline: new Date(campaignData.deadline).getTime() / 1000,
      amountCollected: campaignData.amount_collected.toString(),
      image: campaignData.image_url || '',
      documents: campaignData.documents || [],
      videos: campaignData.videos || [],
      donors: [],
      donations: [],
      isVerified: campaignData.is_verified || false,
      isCompleted: parseFloat(campaignData.amount_collected.toString()) >= parseFloat(campaignData.target_amount.toString()) || 
                   new Date(campaignData.deadline).getTime() / 1000 < Math.floor(Date.now() / 1000),
      creatorName: '' // Will be populated separately
    };
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search campaigns..."
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
