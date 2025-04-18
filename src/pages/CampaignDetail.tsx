
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
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch campaign details
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
      
      // Fetch campaign from Supabase
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
      
      // Get donors and donations from Supabase
      const { data: donationsData, error: donationsError } = await supabase
        .from('donations')
        .select('donor_id, amount')
        .eq('campaign_id', id);
      
      if (donationsError) {
        console.warn('Error fetching donations:', donationsError);
      }

      // Fetch creator profile to get name
      const { data: creatorProfile, error: creatorError } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', campaignData.creator_id)
        .single();
      
      if (!creatorError && creatorProfile) {
        setCreatorName(creatorProfile.display_name || truncateAddress(campaignData.creator_id));
      } else {
        setCreatorName(truncateAddress(campaignData.creator_id));
      }
      
      // Check current deadline and collected amount to determine if completed
      const now = Math.floor(Date.now() / 1000);
      const deadline = new Date(campaignData.deadline).getTime() / 1000;
      const isCompleted = now > deadline || 
                          campaignData.amount_collected >= campaignData.target_amount;
      
      // Format campaign data to match our Campaign type
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
        isCompleted: isCompleted,
        creatorName: creatorName
      };
      
      setCampaign(formattedCampaign);

      // Check if user has already voted
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

  // Donate to campaign
  const donateToCampaign = async () => {
    try {
      if (!isConnected) {
        await connectWallet();
        return;
      }
      
      if (!contract || !campaign) {
        toast({
          title: 'Error',
          description: 'Contract or campaign not found',
          variant: 'destructive'
        });
        return;
      }
      
      setDonating(true);
      
      // Validate donation amount
      const amount = parseFloat(donationAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: 'Invalid Amount',
          description: 'Please enter a valid donation amount',
          variant: 'destructive'
        });
        setDonating(false);
        return;
      }
      
      // Calculate remaining amount to reach target
      const amountCollected = parseFloat(campaign.amountCollected);
      const target = parseFloat(campaign.target);
      const remainingAmount = target - amountCollected;
      
      // Ensure donation doesn't exceed remaining amount
      if (amount > remainingAmount) {
        toast({
          title: 'Donation Exceeds Goal',
          description: `Maximum donation amount allowed is ${remainingAmount.toFixed(4)} ETH to reach the goal`,
          variant: 'destructive'
        });
        setDonating(false);
        return;
      }
      
      try {
        // Convert to wei
        const weiAmount = ethers.utils.parseEther(donationAmount);
        
        // Make donation transaction
        const tx = await contract.donateToCampaign(campaign.id, { value: weiAmount });
        
        toast({
          title: 'Donation Processing',
          description: 'Your donation is being processed.',
        });
        
        // Wait for transaction confirmation
        await tx.wait();
        
        // Also record donation in Supabase
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData && userData.user) {
          const { error: donationError } = await supabase
            .from('donations')
            .insert({
              campaign_id: id,
              donor_id: userData.user.id,
              amount: parseFloat(donationAmount)
            });
            
          if (donationError) {
            console.error('Error recording donation in Supabase:', donationError);
          }
          
          // Update campaign collected amount
          const newAmount = amountCollected + amount;
          const isNowCompleted = newAmount >= target;
          
          const { error: updateError } = await supabase
            .from('campaigns')
            .update({
              amount_collected: newAmount,
              is_completed: isNowCompleted
            })
            .eq('id', id);
            
          if (updateError) {
            console.error('Error updating campaign amount:', updateError);
          }
          
          // Show verification prompt
          promptForVerification();
        }
        
        toast({
          title: 'Donation Successful',
          description: `You have donated ${donationAmount} ETH to this campaign`,
          variant: 'default'
        });
      } catch (error: any) {
        console.error('Blockchain donation error:', error);
        toast({
          title: 'Blockchain Error',
          description: error.message || 'Error during blockchain transaction',
          variant: 'destructive'
        });
      }
      
      // Refresh campaign data
      await fetchCampaignDetails();
      
      // Reset donation amount
      setDonationAmount('0.1');
    } catch (error: any) {
      console.error('Error donating to campaign:', error);
      toast({
        title: 'Donation Failed',
        description: 'An error occurred while processing your donation',
        variant: 'destructive'
      });
    } finally {
      setDonating(false);
    }
  };

  // Prompt user to verify campaign after donation
  const promptForVerification = () => {
    if (hasVoted) return;
    
    toast({
      title: 'Verification Request',
      description: 'Would you like to verify this campaign as legitimate?',
      action: (
        <div className="flex gap-2 mt-2">
          <Button 
            variant="outline" 
            className="bg-green-500 hover:bg-green-600 text-white"
            onClick={() => handleVerificationVote(true)}
          >
            Yes, Verify
          </Button>
          <Button 
            variant="outline" 
            className="bg-red-500 hover:bg-red-600 text-white"
            onClick={() => handleVerificationVote(false)}
          >
            No, Flag
          </Button>
        </div>
      ),
      duration: 10000
    });
  };

  // Handle verification vote
  const handleVerificationVote = async (isVerified: boolean) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData || !userData.user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to verify this campaign',
          variant: 'destructive'
        });
        return;
      }
      
      // Add verification record
      const { error } = await supabase
        .from('campaign_verifications')
        .insert({
          campaign_id: id,
          voter_id: userData.user.id,
          is_verified: isVerified
        });
        
      if (error) {
        throw error;
      }
      
      setHasVoted(true);
      
      toast({
        title: 'Thank You',
        description: isVerified 
          ? 'You have verified this campaign as legitimate' 
          : 'You have flagged this campaign for review',
        variant: 'default'
      });
      
      // Refresh to update verification status
      await fetchCampaignDetails();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to record your verification. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Verify campaign (admin only)
  const verifyCampaign = async () => {
    try {
      if (!contract || !campaign || !isVerifiedCreator) {
        toast({
          title: 'Error',
          description: 'You do not have permission to verify campaigns',
          variant: 'destructive'
        });
        return;
      }
      
      // Update in Supabase
      const { error: verifyError } = await supabase
        .from('campaigns')
        .update({
          is_verified: true,
          verified_by: address,
          verified_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (verifyError) {
        console.error('Error verifying campaign in Supabase:', verifyError);
        throw verifyError;
      }
      
      // Call verify campaign function on contract if available
      try {
        if (contract.verifyCampaign) {
          const tx = await contract.verifyCampaign(campaign.id);
          await tx.wait();
        }
      } catch (contractError) {
        console.error('Error verifying campaign on blockchain:', contractError);
        // Continue anyway since we updated in Supabase
      }
      
      toast({
        title: 'Campaign Verified',
        description: 'This campaign has been successfully verified',
        variant: 'default'
      });
      
      // Refresh campaign data
      await fetchCampaignDetails();
    } catch (error) {
      console.error('Error verifying campaign:', error);
      toast({
        title: 'Verification Failed',
        description: 'An error occurred while verifying the campaign',
        variant: 'destructive'
      });
    }
  };

  // Share campaign
  const shareCampaign = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: 'Link Copied',
      description: 'Campaign link has been copied to clipboard',
    });
  };

  useEffect(() => {
    fetchCampaignDetails();
    
    // Set up real-time subscription for this campaign
    const channel = supabase
      .channel(`campaign-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaigns',
        filter: `id=eq.${id}`
      }, (payload) => {
        console.log('Campaign updated:', payload);
        fetchCampaignDetails();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-600 text-lg">Loading campaign details...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            {error || 'Campaign not found'}
          </h1>
          <p className="text-gray-600 mb-8">
            The campaign you're looking for doesn't exist or could not be loaded.
          </p>
          <Button onClick={() => navigate('/')} variant="default">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const progress = calculateProgress(campaign.amountCollected, campaign.target);
  const timeRemaining = calculateTimeRemaining(campaign.deadline);
  const isOwner = address && address.toLowerCase() === campaign.owner.toLowerCase();
  const isActive = !campaign.isCompleted && campaign.deadline > Math.floor(Date.now() / 1000);
  const remainingAmount = parseFloat(campaign.target) - parseFloat(campaign.amountCollected);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-indigo-600 hover:text-indigo-800 mb-6"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-1" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" 
              clipRule="evenodd" 
            />
          </svg>
          Back to Campaigns
        </button>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Campaign details */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="relative rounded-lg overflow-hidden">
                <img 
                  src={campaign.image || '/placeholder.svg'} 
                  alt={campaign.title} 
                  className="w-full h-[400px] object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                <div className="absolute top-4 right-4 flex flex-col space-y-2">
                  {campaign.isCompleted && (
                    <Badge className="bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1.5 text-sm flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" />
                      <span>Completed</span>
                    </Badge>
                  )}
                  {campaign.isVerified && (
                    <Badge className="bg-green-100 text-green-800 border border-green-200 px-3 py-1.5 text-sm flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" />
                      <span>Verified Campaign</span>
                    </Badge>
                  )}
                  {isOwner && (
                    <Badge className="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1.5 text-sm">
                      <span>Your Campaign</span>
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="mt-6">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <h1 className="text-3xl font-bold text-gray-900">{campaign.title}</h1>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={shareCampaign}
                      className="flex items-center gap-1"
                    >
                      <Share2 className="h-4 w-4" />
                      <span>Share</span>
                    </Button>
                    {isVerifiedCreator && !campaign.isVerified && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={verifyCampaign}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span>Verify Campaign</span>
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center mt-2 text-gray-600 gap-2">
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span>by {campaign.creatorName || truncateAddress(campaign.owner)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center space-x-6 mb-4">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="h-5 w-5" />
                  <span>{timeRemaining}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Users className="h-5 w-5" />
                  <span>{campaign.donors.length} donor{campaign.donors.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{formatEthAmount(campaign.amountCollected)}</span>
                  <span className="text-gray-600">raised of {formatEthAmount(campaign.target)} goal</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
            
            <Tabs defaultValue="story">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="story">Story</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="donors">Donors</TabsTrigger>
              </TabsList>
              
              <TabsContent value="story" className="pt-4">
                <div className="prose max-w-none">
                  <p className="whitespace-pre-line text-gray-700">
                    {campaign.description}
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="documents" className="pt-4">
                {campaign.documents.length === 0 && campaign.videos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No documents or videos available for this campaign</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {campaign.documents.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Campaign Documents</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {campaign.documents.map((doc, index) => (
                            <Card key={`doc-${index}`} className="overflow-hidden">
                              <CardContent className="p-4 flex items-center gap-3">
                                <div className="bg-gray-100 p-2 rounded-md">
                                  <File className="h-6 w-6 text-gray-500" />
                                </div>
                                <div className="truncate">
                                  <a 
                                    href={doc} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium hover:text-indigo-600 flex items-center"
                                  >
                                    <span className="truncate">Document #{index + 1}</span>
                                    <LinkIcon className="h-3 w-3 ml-1.5 flex-shrink-0" />
                                  </a>
                                  <p className="text-xs text-gray-500 truncate">{doc}</p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {campaign.videos.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Campaign Videos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {campaign.videos.map((video, index) => (
                            <Card key={`video-${index}`} className="overflow-hidden">
                              <CardContent className="p-4 flex items-center gap-3">
                                <div className="bg-gray-100 p-2 rounded-md">
                                  <Video className="h-6 w-6 text-gray-500" />
                                </div>
                                <div className="truncate">
                                  <a 
                                    href={video} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium hover:text-indigo-600 flex items-center"
                                  >
                                    <span className="truncate">Video #{index + 1}</span>
                                    <LinkIcon className="h-3 w-3 ml-1.5 flex-shrink-0" />
                                  </a>
                                  <p className="text-xs text-gray-500 truncate">{video}</p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="donors" className="pt-4">
                {campaign.donors.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No donations yet. Be the first to donate!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaign.donors.map((donor, index) => (
                      <div 
                        key={index} 
                        className="flex justify-between items-center p-3 rounded-lg border border-gray-200 bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-100 p-2 rounded-full">
                            <Wallet className="h-5 w-5 text-indigo-600" />
                          </div>
                          <span className="font-medium">{truncateAddress(donor)}</span>
                        </div>
                        <span className="font-medium text-gray-700">
                          {formatEthAmount(campaign.donations[index] || '0')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Right column: Donation widget */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm sticky top-24">
              <div className="p-6">
                <h3 className="text-xl font-bold mb-4">Make a Donation</h3>
                
                {!isActive ? (
                  <div className="text-center py-6">
                    <Clock className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <h4 className="text-lg font-medium text-gray-900 mb-1">
                      {campaign.isCompleted ? 'Campaign Completed' : 'Campaign Ended'}
                    </h4>
                    <p className="text-gray-600">This campaign is no longer accepting donations</p>
                  </div>
                ) : remainingAmount <= 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
                    <h4 className="text-lg font-medium text-gray-900 mb-1">Goal Reached</h4>
                    <p className="text-gray-600">This campaign has reached its funding goal</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Donation Amount (ETH)
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <Input
                          type="number"
                          value={donationAmount}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            // Ensure donation doesn't exceed remaining amount
                            if (isNaN(value) || value <= remainingAmount) {
                              setDonationAmount(e.target.value);
                            } else {
                              setDonationAmount(remainingAmount.toString());
                            }
                          }}
                          min="0"
                          step="0.01"
                          max={remainingAmount.toString()}
                          className="pr-12"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">ETH</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Max donation: {remainingAmount.toFixed(4)} ETH
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const amount = 0.1;
                          if (amount <= remainingAmount) {
                            setDonationAmount('0.1');
                          } else {
                            setDonationAmount(remainingAmount.toString());
                          }
                        }}
                        className="w-full"
                      >
                        0.1 ETH
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const amount = 0.5;
                          if (amount <= remainingAmount) {
                            setDonationAmount('0.5');
                          } else {
                            setDonationAmount(remainingAmount.toString());
                          }
                        }}
                        className="w-full"
                      >
                        0.5 ETH
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const amount = 1;
                          if (amount <= remainingAmount) {
                            setDonationAmount('1');
                          } else {
                            setDonationAmount(remainingAmount.toString());
                          }
                        }}
                        className="w-full"
                      >
                        1 ETH
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const amount = 2;
                          if (amount <= remainingAmount) {
                            setDonationAmount('2');
                          } else {
                            setDonationAmount(remainingAmount.toString());
                          }
                        }}
                        className="w-full"
                      >
                        2 ETH
                      </Button>
                    </div>
                    
                    <Button
                      onClick={donateToCampaign}
                      disabled={donating}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      {donating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Donate Now'
                      )}
                    </Button>
                    
                    {!isConnected && (
                      <p className="text-sm text-gray-500 mt-2 text-center">
                        You'll need to connect your wallet first
                      </p>
                    )}
                    
                    {!hasVoted && campaign.donors.includes(address || '') && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <h4 className="text-sm font-medium text-blue-700 mb-2">Verify This Campaign</h4>
                        <p className="text-xs text-blue-600 mb-3">
                          As a donor, your opinion helps others. Is this campaign legitimate?
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                            onClick={() => handleVerificationVote(true)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Yes
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="w-full bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                            onClick={() => handleVerificationVote(false)}
                          >
                            <AlertCircle className="h-3 w-3 mr-1" /> No
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                <div className="border-t border-gray-200 mt-6 pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-5 w-5 text-gray-500" />
                    <h4 className="font-medium">Campaign Creator</h4>
                  </div>
                  <p className="text-gray-600">{campaign.creatorName || truncateAddress(campaign.owner)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CampaignDetail;
