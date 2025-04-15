
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '@/context/Web3Context';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import CampaignCard from '@/components/CampaignCard';
import { 
  Wallet, 
  CheckCircle, 
  TrendingUp, 
  DollarSign, 
  Target, 
  Clock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UserProfile {
  display_name: string | null;
  total_donated: number;
  total_raised: number;
  campaigns_created: number;
  donations_made: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { address, isConnected, connectWallet, balance } = useWeb3();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userCampaigns, setUserCampaigns] = useState<any[]>([]);
  const [userDonations, setUserDonations] = useState<any[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('display_name, total_donated, total_raised, campaigns_created, donations_made')
          .eq('id', user.id)
          .single();

        // Fetch user's campaigns
        const { data: campaignsData, error: campaignsError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('creator_id', user.id);

        // Fetch user's donations
        const { data: donationsData, error: donationsError } = await supabase
          .from('donations')
          .select('*, campaigns(*)')
          .eq('donor_id', user.id);

        if (profileData) setProfile(profileData);
        if (campaignsData) setUserCampaigns(campaignsData);
        if (donationsData) setUserDonations(donationsData);
      }
    };

    fetchUserData();
  }, []);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-muted-foreground mb-6">
            Please connect your wallet to view your profile and manage campaigns
          </p>
          <Button onClick={connectWallet} variant="default">
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Total Donated</CardTitle>
                <DollarSign className="text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${profile?.total_donated?.toFixed(2) || '0.00'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Campaigns Created</CardTitle>
                <Target className="text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {profile?.campaigns_created || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Total Raised</CardTitle>
                <TrendingUp className="text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${profile?.total_raised?.toFixed(2) || '0.00'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="campaigns">
          <TabsList className="mb-6">
            <TabsTrigger value="campaigns">My Campaigns</TabsTrigger>
            <TabsTrigger value="donations">My Donations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="campaigns">
            {userCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  You haven't created any campaigns yet.
                </p>
                <Button 
                  onClick={() => navigate('/create-campaign')} 
                  className="mt-4"
                >
                  Create Campaign
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="donations">
            {userDonations.length > 0 ? (
              <div className="space-y-4">
                {userDonations.map((donation) => (
                  <Card key={donation.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>
                          Donated to: {donation.campaigns.title}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          <Clock className="text-muted-foreground" size={16} />
                          <span className="text-sm text-muted-foreground">
                            {new Date(donation.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-bold">
                        ${donation.amount.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  You haven't made any donations yet.
                </p>
                <Button 
                  onClick={() => navigate('/')} 
                  className="mt-4"
                >
                  Explore Campaigns
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
