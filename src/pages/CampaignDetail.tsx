
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '@/context/Web3Context';
import { Campaign } from '@/types/campaign';
import { formatCampaign, calculateProgress, formatEthAmount, calculateTimeRemaining, truncateAddress, calculateRemainingAmount } from '@/utils/contractUtils';
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

  const fetchCampaignDetails = useCallback(async () => {
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
      
      if (campaignData) {
        const amountCollectedNum = parseFloat(campaignData.amount_collected.toString());
        const targetNum = parseFloat(campaignData.target_amount.toString());
        setRealTimeAmountCollected(amountCollectedNum.toString());
        setRealTimeProgress(calculateProgress(amountCollectedNum, targetNum));
      }
      
      // Check if user has already voted
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: voteData } = await supabase
          .from('campaign_verifications')
          .select('*')
          .eq('campaign_id', id)
          .eq('voter_id', user.id);
          
        setHasVoted(voteData && voteData.length > 0);
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
  }, [id, address]);

  useEffect(() => {
    fetchCampaignDetails();
  }, [fetchCampaignDetails]);

  // Function to handle donations
  const handleDonation = async () => {
    if (!campaign) return;
    
    try {
      setDonating(true);
      
      if (!isConnected) {
        await connectWallet();
        setDonating(false);
        return;
      }
      
      // Check donation amount
      const donationAmountValue = parseFloat(donationAmount);
      if (isNaN(donationAmountValue) || donationAmountValue <= 0) {
        toast({
          title: 'Invalid donation',
          description: 'Please enter a valid donation amount',
          variant: 'destructive'
        });
        setDonating(false);
        return;
      }
      
      // Check if donation exceeds remaining amount
      const remainingAmount = calculateRemainingAmount(campaign.amountCollected, campaign.target);
      if (donationAmountValue > remainingAmount) {
        toast({
          title: 'Invalid donation amount',
          description: `You cannot donate more than the remaining amount needed (${formatEthAmount(remainingAmount)})`,
          variant: 'destructive'
        });
        setDonating(false);
        return;
      }
      
      // Get user authentication info
      const { data: userData } = await supabase.auth.getUser();
      if (!userData || !userData.user) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to donate',
          variant: 'destructive'
        });
        setDonating(false);
        navigate('/auth');
        return;
      }
      
      if (!contract) {
        toast({
          title: 'Contract not connected',
          description: 'Please make sure your wallet is connected correctly',
          variant: 'destructive'
        });
        setDonating(false);
        return;
      }
      
      // Convert ETH to Wei for the transaction
      // Fix: Make sure we're using a valid string representation of the number
      const donationString = donationAmountValue.toString();
      const amountInWei = ethers.utils.parseEther(donationString);
      
      // Call the contract's donateToCampaign function
      const tx = await contract.donateToCampaign(campaign.id, {
        value: amountInWei
      });
      
      toast({
        title: 'Transaction submitted',
        description: 'Please confirm the transaction in MetaMask',
        variant: 'default'
      });
      
      // Wait for the transaction to be mined
      await tx.wait();
      
      // Insert donation record
      const { error: donationError } = await supabase
        .from('donations')
        .insert({
          campaign_id: id,
          donor_id: userData.user.id,
          amount: donationAmountValue
        });
      
      if (donationError) {
        console.error('Error saving donation:', donationError);
        throw new Error('Failed to save donation');
      }
      
      // Update campaign total
      const newTotal = parseFloat(campaign.amountCollected) + donationAmountValue;
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ amount_collected: newTotal })
        .eq('id', id);
      
      if (updateError) {
        console.error('Error updating campaign amount:', updateError);
        throw new Error('Failed to update campaign');
      }
      
      // Update UI
      setRealTimeAmountCollected(newTotal.toString());
      setRealTimeProgress(calculateProgress(newTotal.toString(), campaign.target));
      
      toast({
        title: 'Donation successful',
        description: `Thank you for your donation of ${donationAmount} ETH!`,
        variant: 'default'
      });
      
      // Refresh campaign details
      fetchCampaignDetails();
    } catch (error: any) {
      console.error('Donation error:', error);
      toast({
        title: 'Donation failed',
        description: error.message || 'There was a problem processing your donation',
        variant: 'destructive'
      });
    } finally {
      setDonating(false);
    }
  };

  // Function to vote on campaign verification
  const handleVerificationVote = async (vote: boolean) => {
    try {
      if (!campaign || !id) return;
      
      if (!isConnected) {
        await connectWallet();
        return;
      }
      
      // Get user authentication info
      const { data: userData } = await supabase.auth.getUser();
      if (!userData || !userData.user) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to vote',
          variant: 'destructive'
        });
        navigate('/auth');
        return;
      }
      
      // Check if user has donated to this campaign
      const { data: donationData } = await supabase
        .from('donations')
        .select('*')
        .eq('campaign_id', id)
        .eq('donor_id', userData.user.id);
      
      if (!donationData || donationData.length === 0) {
        toast({
          title: 'Donation required',
          description: 'You must donate to this campaign before voting',
          variant: 'destructive'
        });
        return;
      }
      
      // Insert verification vote
      const { error } = await supabase
        .from('campaign_verifications')
        .insert({
          campaign_id: id,
          voter_id: userData.user.id,
          is_verified: vote
        });
      
      if (error) {
        throw error;
      }
      
      setHasVoted(true);
      
      toast({
        title: 'Vote submitted',
        description: `You have ${vote ? 'verified' : 'flagged'} this campaign`,
        variant: 'default'
      });
      
      // Refresh campaign details to update verification status
      fetchCampaignDetails();
    } catch (error: any) {
      console.error('Verification vote error:', error);
      toast({
        title: 'Vote failed',
        description: error.message || 'There was a problem submitting your vote',
        variant: 'destructive'
      });
    }
  };

  // Function to share campaign
  const handleShare = async () => {
    try {
      const shareData = {
        title: campaign?.title || 'Check out this campaign',
        text: campaign?.description || 'Help support this campaign',
        url: window.location.href
      };
      
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: 'Link copied',
          description: 'Campaign link copied to clipboard',
          variant: 'default'
        });
      }
    } catch (error: any) {
      console.error('Share error:', error);
      if (error.name !== 'AbortError') {
        toast({
          title: 'Share failed',
          description: 'There was a problem sharing this campaign',
          variant: 'destructive'
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[70vh]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h3 className="text-xl font-semibold">Loading campaign details...</h3>
          </div>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[70vh]">
          <div className="text-center space-y-4 max-w-md mx-auto">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Campaign Not Found</h2>
            <p className="text-muted-foreground">{error || 'The campaign you are looking for does not exist or has been removed.'}</p>
            <Button onClick={() => navigate('/')}>Back to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = campaign.isCompleted || 
                      parseFloat(campaign.amountCollected) >= parseFloat(campaign.target) ||
                      campaign.deadline < Math.floor(Date.now() / 1000);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Campaign Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{campaign.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">by {campaign.creatorName}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {isCompleted ? (
              <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Completed
              </Badge>
            ) : campaign.isVerified ? (
              <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                <Clock className="h-3.5 w-3.5 mr-1" />
                Pending Verification
              </Badge>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1" 
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Campaign Image and Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg overflow-hidden border bg-card">
              <img 
                src={campaign.image || '/placeholder.svg'} 
                alt={campaign.title} 
                className="w-full aspect-video object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            </div>
            
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="videos">Videos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="about" className="p-4 mt-2 rounded-md border bg-card">
                <h3 className="text-xl font-semibold mb-2">About this campaign</h3>
                <p className="text-muted-foreground whitespace-pre-line">
                  {campaign.description}
                </p>
              </TabsContent>
              
              <TabsContent value="documents" className="p-4 mt-2 rounded-md border bg-card">
                <h3 className="text-xl font-semibold mb-4">Documents</h3>
                {campaign.documents && campaign.documents.length > 0 ? (
                  <div className="space-y-2">
                    {campaign.documents.map((doc, index) => (
                      <a 
                        key={index}
                        href={doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-3 rounded-md border hover:bg-accent/50 transition-colors"
                      >
                        <File className="h-5 w-5 mr-2 text-primary" />
                        <span className="flex-1 truncate">Document {index + 1}</span>
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No documents available for this campaign.</p>
                )}
              </TabsContent>
              
              <TabsContent value="videos" className="p-4 mt-2 rounded-md border bg-card">
                <h3 className="text-xl font-semibold mb-4">Videos</h3>
                {campaign.videos && campaign.videos.length > 0 ? (
                  <div className="space-y-4">
                    {campaign.videos.map((video, index) => (
                      <div key={index} className="rounded-md overflow-hidden border">
                        <video 
                          controls 
                          src={video} 
                          className="w-full aspect-video"
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No videos available for this campaign.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Right Column - Donation Info and Actions */}
          <div className="space-y-6">
            {/* Campaign Stats Card */}
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Raised so far</span>
                    <span className="font-semibold">{formatEthAmount(realTimeAmountCollected)} / {formatEthAmount(campaign.target)}</span>
                  </div>
                  <Progress value={realTimeProgress} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center justify-center p-3 rounded-md bg-muted/50">
                    <Users className="h-5 w-5 text-primary mb-1" />
                    <span className="text-xs text-muted-foreground">Donors</span>
                    <span className="font-semibold">{campaign.donors.length}</span>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center p-3 rounded-md bg-muted/50">
                    <Calendar className="h-5 w-5 text-primary mb-1" />
                    <span className="text-xs text-muted-foreground">Time left</span>
                    <span className="font-semibold text-center">{calculateTimeRemaining(campaign.deadline)}</span>
                  </div>
                </div>
                
                {!isCompleted && (
                  <div className="space-y-4">
                    <div className="flex flex-col space-y-2">
                      <label htmlFor="donationAmount" className="text-sm font-medium">
                        Donation amount (ETH)
                      </label>
                      <Input
                        id="donationAmount"
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                        className="w-full"
                      />
                      <div className="text-xs text-muted-foreground">
                        Maximum donation: {formatEthAmount(calculateRemainingAmount(campaign.amountCollected, campaign.target))}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleDonation}
                      disabled={donating}
                      className="w-full"
                    >
                      {donating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Donate Now
                    </Button>
                  </div>
                )}
                
                {!isCompleted && !campaign.isVerified && !hasVoted && (
                  <div className="border-t pt-4 mt-4 space-y-2">
                    <p className="text-sm text-muted-foreground mb-2">
                      Verify this campaign if you believe it's legitimate
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950" 
                        onClick={() => handleVerificationVote(true)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Verify
                      </Button>
                      <Button 
                        variant="outline" 
                        className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950" 
                        onClick={() => handleVerificationVote(false)}
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Flag
                      </Button>
                    </div>
                  </div>
                )}
                
                {hasVoted && (
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm text-center text-muted-foreground">
                      You have already voted on this campaign
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
