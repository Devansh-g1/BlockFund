
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '@/context/Web3Context';
import Header from '@/components/Header';
import { Campaign } from '@/types/campaign';
import CampaignCard from '@/components/CampaignCard';
import { formatCampaign, truncateAddress } from '@/utils/contractUtils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, User, Wallet, CheckCircle } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { address, isConnected, connectWallet, contract, balance, isVerifiedCreator } = useWeb3();
  const [myCampaigns, setMyCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch user's campaigns
  const fetchMyCampaigns = async () => {
    try {
      setLoading(true);
      
      if (contract) {
        // Get all campaigns
        const allCampaigns = await contract.getCampaigns();
        
        // Filter campaigns owned by the current user
        const filteredCampaigns = allCampaigns
          .map((campaign: any, index: number) => ({ ...campaign, id: index }))
          .filter((campaign: any) => 
            campaign.owner.toLowerCase() === address?.toLowerCase()
          )
          .map((campaign: any) => formatCampaign(campaign, campaign.id));
        
        setMyCampaigns(filteredCampaigns);
      } else {
        // Mock data for demo
        setTimeout(() => {
          const mockCampaigns: Campaign[] = [
            {
              id: 0,
              owner: address || '0x1234567890123456789012345678901234567890',
              title: 'Clean Water Initiative',
              description: 'Help us provide clean water to rural communities in need.',
              target: '5',
              deadline: Math.floor(Date.now() / 1000) + 2592000, // 30 days from now
              amountCollected: '2.5',
              image: 'https://images.unsplash.com/photo-1519593135389-e4145968f52d',
              documents: ['https://ipfs.io/ipfs/QmDocument1'],
              videos: ['https://ipfs.io/ipfs/QmVideo1'],
              donors: ['0xDonor1', '0xDonor2', '0xDonor3'],
              donations: ['1.2', '0.8', '0.5'],
              isVerified: true
            }
          ];
          
          setMyCampaigns(mockCampaigns);
          setLoading(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchMyCampaigns();
    } else {
      setLoading(false);
    }
  }, [isConnected, address, contract]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
          <User className="h-16 w-16 text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Connect Your Wallet
          </h1>
          <p className="text-gray-600 max-w-md mx-auto mb-8">
            Please connect your wallet to view your profile, campaigns, and donations.
          </p>
          <Button 
            onClick={connectWallet} 
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-32"></div>
            <div className="px-6 pb-6 relative">
              <div className="flex flex-col md:flex-row md:items-end mt-[-40px] mb-6 gap-4">
                <div className="bg-white rounded-full p-2 shadow-md inline-flex">
                  <div className="bg-indigo-100 rounded-full h-20 w-20 flex items-center justify-center">
                    <User className="h-10 w-10 text-indigo-600" />
                  </div>
                </div>
                <div>
                  <div className="mt-2 md:mt-0">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {truncateAddress(address || '')}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Wallet className="h-4 w-4" />
                        <span>{parseFloat(balance).toFixed(4)} ETH</span>
                      </div>
                      
                      {isVerifiedCreator && (
                        <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>Verified Creator</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="md:ml-auto">
                  {isVerifiedCreator ? (
                    <Button
                      onClick={() => navigate('/create-campaign')}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      Create New Campaign
                    </Button>
                  ) : (
                    <div className="bg-amber-100 text-amber-800 px-3 py-2 rounded-md text-sm">
                      You need to be verified to create campaigns
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="campaigns">
            <TabsList className="mb-6">
              <TabsTrigger value="campaigns">My Campaigns</TabsTrigger>
              <TabsTrigger value="donations">My Donations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="campaigns">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
                  <p className="text-gray-600">Loading your campaigns...</p>
                </div>
              ) : myCampaigns.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="mx-auto w-20 h-20 flex items-center justify-center bg-gray-100 rounded-full mb-4">
                    <svg
                      className="w-10 h-10 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-medium text-gray-900 mb-2">No Campaigns Yet</h2>
                  <p className="text-gray-600 max-w-md mx-auto mb-6">
                    You haven't created any campaigns yet. Start your first campaign to raise funds.
                  </p>
                  {isVerifiedCreator ? (
                    <Button
                      onClick={() => navigate('/create-campaign')}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      Create First Campaign
                    </Button>
                  ) : (
                    <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-md inline-block">
                      You need to be verified to create campaigns
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myCampaigns.map((campaign) => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="donations">
              <div className="py-20 text-center">
                <div className="mx-auto w-20 h-20 flex items-center justify-center bg-gray-100 rounded-full mb-4">
                  <Wallet className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-xl font-medium text-gray-900 mb-2">Donation History</h2>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  This feature will be available in the next version of BlockFund.
                </p>
                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                >
                  Explore Campaigns
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Profile;
