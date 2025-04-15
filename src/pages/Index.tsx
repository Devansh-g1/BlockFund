
import React, { useEffect, useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { Campaign } from '@/types/campaign';
import CampaignCard from '@/components/CampaignCard';
import Header from '@/components/Header';
import { formatCampaign } from '@/utils/contractUtils';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const { contract, connectWallet, isConnected } = useWeb3();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all');

  // Fetch campaigns from the contract
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      
      if (!contract) {
        setError('Please connect your wallet to view campaigns');
        setLoading(false);
        return;
      }
      
      // Call the contract's getCampaigns method
      const campaignData = await contract.getCampaigns();
      
      // Format the campaign data
      const formattedCampaigns = campaignData.map((campaign: any, i: number) => 
        formatCampaign(campaign, i)
      );
      
      setCampaigns(formattedCampaigns);
      setError(null);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setError('Failed to load campaigns. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Connect wallet and fetch campaigns on mount
  useEffect(() => {
    const init = async () => {
      if (isConnected && contract) {
        await fetchCampaigns();
      } else {
        // If no real data is loaded, use mock data for demo
        setLoading(true);
        setTimeout(() => {
          // Mock campaigns for development
          const mockCampaigns: Campaign[] = [
            {
              id: 0,
              owner: '0x1234567890123456789012345678901234567890',
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
            },
            {
              id: 1,
              owner: '0x2345678901234567890123456789012345678901',
              title: 'Community Food Bank',
              description: 'Support our local food bank to help families in need during these challenging times.',
              target: '3',
              deadline: Math.floor(Date.now() / 1000) + 1296000, // 15 days from now
              amountCollected: '0.9',
              image: 'https://images.unsplash.com/photo-1593113646773-028c64a8f1b8',
              documents: ['https://ipfs.io/ipfs/QmDocument2'],
              videos: [],
              donors: ['0xDonor4', '0xDonor5'],
              donations: ['0.5', '0.4'],
              isVerified: false
            },
            {
              id: 2,
              owner: '0x3456789012345678901234567890123456789012',
              title: 'Education for All',
              description: 'Help us provide educational resources to underprivileged children around the world.',
              target: '10',
              deadline: Math.floor(Date.now() / 1000) + 864000, // 10 days from now
              amountCollected: '7.2',
              image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b',
              documents: ['https://ipfs.io/ipfs/QmDocument3', 'https://ipfs.io/ipfs/QmDocument4'],
              videos: ['https://ipfs.io/ipfs/QmVideo2'],
              donors: ['0xDonor6', '0xDonor7', '0xDonor8', '0xDonor9', '0xDonor10'],
              donations: ['2.0', '1.5', '1.2', '1.5', '1.0'],
              isVerified: true
            }
          ];
          
          setCampaigns(mockCampaigns);
          setLoading(false);
        }, 1500);
      }
    };

    init();
  }, [contract, isConnected]);

  // Filter campaigns based on search term and active tab
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        campaign.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'verified') return matchesSearch && campaign.isVerified;
    if (activeTab === 'ongoing') {
      const now = Math.floor(Date.now() / 1000);
      return matchesSearch && campaign.deadline > now;
    }
    if (activeTab === 'completed') {
      const now = Math.floor(Date.now() / 1000);
      return matchesSearch && campaign.deadline <= now;
    }
    
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <section className="mb-10">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Decentralized Crowdfunding
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Empowering verified campaigners to raise funds transparently through blockchain, while enabling secure donations.
            </p>
            
            {!isConnected && (
              <Button 
                onClick={connectWallet} 
                size="lg" 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Connect Wallet to Start
              </Button>
            )}
          </div>
        </section>
        
        <section className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <Input
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="verified">Verified</TabsTrigger>
                <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-600">Loading campaigns...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
              <p className="text-gray-800 font-medium mb-2">{error}</p>
              <Button onClick={connectWallet} variant="outline">
                Connect Wallet
              </Button>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-gray-600 mb-4">No campaigns found</p>
              {searchTerm && (
                <Button onClick={() => setSearchTerm('')} variant="outline">
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </section>
      </main>
      
      <footer className="bg-gray-100 py-8 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p className="mb-2">BlockFund - Decentralized Crowdfunding Platform</p>
          <p className="text-sm">Built with React, TypeScript, and Smart Contracts on Holesky Testnet</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
