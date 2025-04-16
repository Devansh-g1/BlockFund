
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '@/context/Web3Context';
import { Campaign } from '@/types/campaign';
import CampaignCard from '@/components/CampaignCard';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';

const Index = () => {
  const navigate = useNavigate();
  const { isConnected } = useWeb3();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all');

  // Fetch campaigns from Supabase
  const loadCampaigns = async () => {
    try {
      setLoading(true);
      console.log('Fetching campaigns from Supabase...');
      
      // Get campaigns from Supabase
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (campaignError) {
        console.error('Error fetching campaigns:', campaignError);
        throw campaignError;
      }
      
      if (!campaignData) {
        console.log('No campaigns found');
        setCampaigns([]);
        return;
      }
      
      console.log("Fetched campaigns:", campaignData);
      
      // Transform the data to match our Campaign type
      const formattedCampaigns = campaignData.map((campaign: any) => ({
        id: campaign.id,
        owner: campaign.creator_id,
        title: campaign.title,
        description: campaign.description,
        target: campaign.target_amount.toString(),
        deadline: new Date(campaign.deadline).getTime() / 1000,
        amountCollected: campaign.amount_collected.toString(),
        image: campaign.image_url || '',
        documents: campaign.documents || [],
        videos: campaign.videos || [],
        donors: [], // This would need to be fetched from a separate table
        donations: [], // This would need to be fetched from a separate table
        isVerified: campaign.is_verified
      }));
      
      setCampaigns(formattedCampaigns);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      setError('Failed to load campaigns. Please try again later.');
      toast({
        title: 'Error',
        description: 'Failed to load campaigns. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    loadCampaigns();
    
    // Subscribe to changes
    const channel = supabase
      .channel('public:campaigns')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'campaigns' 
      }, () => {
        console.log("Real-time update received for campaigns");
        loadCampaigns();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <section className="mb-10">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
              Decentralized Crowdfunding
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Empowering verified campaigners to raise funds transparently through blockchain, while enabling secure donations.
            </p>
            
            {!isConnected ? (
              <Button 
                onClick={() => navigate('/auth')} 
                size="lg" 
                className="bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/90 hover:to-indigo-500/90"
              >
                Connect to Start
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/create-campaign')} 
                size="lg" 
                className="bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/90 hover:to-indigo-500/90"
              >
                <Plus className="mr-2 h-5 w-5" />
                Host a Campaign
              </Button>
            )}
          </div>
        </section>
        
        <section className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadCampaigns}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="verified">Verified</TabsTrigger>
                  <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading campaigns...</p>
            </div>
          ) : error ? (
            <Card className="py-10 text-center">
              <CardContent className="flex flex-col items-center justify-center">
                <AlertCircle className="h-10 w-10 text-destructive mb-4" />
                <p className="text-foreground font-medium mb-2">{error}</p>
                <Button onClick={() => loadCampaigns()} variant="outline" className="mt-2">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : filteredCampaigns.length === 0 ? (
            <Card className="py-10 text-center">
              <CardContent className="flex flex-col items-center justify-center">
                <p className="text-muted-foreground mb-4">No campaigns found</p>
                {searchTerm ? (
                  <Button onClick={() => setSearchTerm('')} variant="outline">
                    Clear Search
                  </Button>
                ) : isConnected ? (
                  <Button 
                    onClick={() => navigate('/create-campaign')} 
                    className="bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/90 hover:to-indigo-500/90"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Host the First Campaign
                  </Button>
                ) : (
                  <Button 
                    onClick={() => navigate('/auth')} 
                    className="bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/90 hover:to-indigo-500/90"
                  >
                    Connect to Start
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id.toString()} campaign={campaign} />
              ))}
            </div>
          )}
        </section>
      </main>
      
      <footer className="border-t border-border py-8 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="mb-2">BlockFund - Decentralized Crowdfunding Platform</p>
          <p className="text-sm">Built with React, TypeScript, and Smart Contracts on Holesky Testnet</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
