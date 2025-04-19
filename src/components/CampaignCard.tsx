
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Campaign } from '@/types/campaign';
import { Progress } from '@/components/ui/progress';
import { calculateProgress, formatEthAmount, calculateTimeRemaining, truncateAddress, calculateRemainingAmount } from '@/utils/contractUtils';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, CheckCircle, Users, ShieldCheck, Clock, Flag, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useWeb3 } from '@/context/Web3Context';
import { ethers } from 'ethers';

interface CampaignCardProps {
  campaign: Campaign;
}

const CampaignCard: React.FC<CampaignCardProps> = ({ campaign }) => {
  const { toast } = useToast();
  const { contract, address, isConnected, connectWallet } = useWeb3();
  const progress = calculateProgress(campaign.amountCollected, campaign.target);
  const timeRemaining = calculateTimeRemaining(campaign.deadline);
  const [isGovVerified, setIsGovVerified] = useState<boolean>(false);
  const [userVerificationStatus, setUserVerificationStatus] = useState<boolean | null>(null);
  const [canVote, setCanVote] = useState<boolean>(false);
  const [creatorName, setCreatorName] = useState<string>('');
  const [donationAmount, setDonationAmount] = useState<string>('0.1');
  const isCompleted = campaign.isCompleted || 
                      parseFloat(campaign.amountCollected) >= parseFloat(campaign.target) ||
                      campaign.deadline < Math.floor(Date.now() / 1000);

  useEffect(() => {
    const fetchVerificationData = async () => {
      try {
        // Get creator's display name
        const { data: creatorProfile, error: creatorError } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', campaign.owner)
          .single();
          
        if (!creatorError && creatorProfile) {
          setCreatorName(creatorProfile.display_name || truncateAddress(campaign.owner));
        } else {
          setCreatorName(truncateAddress(campaign.owner));
        }

        // Check if email ends with @gov.in
        try {
          const { data: userData } = await supabase.auth
            .getUser();
            
          if (userData && userData.user) {
            const userEmail = userData?.user?.email || '';
            setIsGovVerified(userEmail.endsWith('@gov.in'));
          }
        } catch (authError) {
          console.error('Auth error:', authError);
        }

        // Check if current user can vote
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: donationData } = await supabase
            .from('donations')
            .select('*')
            .eq('campaign_id', campaign.id.toString())
            .eq('donor_id', user.id)
            .single();

          if (donationData) {
            // Check if user has already voted
            const { data: voteData } = await supabase
              .from('campaign_verifications')
              .select('*')
              .eq('campaign_id', campaign.id.toString())
              .eq('voter_id', user.id)
              .single();

            setCanVote(!voteData);
          }
        }

        // Check user's verification vote
        if (user) {
          const { data: userVoteData } = await supabase
            .from('campaign_verifications')
            .select('is_verified')
            .eq('campaign_id', campaign.id.toString())
            .eq('voter_id', user?.id || '')
            .single();

          setUserVerificationStatus(userVoteData?.is_verified ?? null);
        }
      } catch (error) {
        console.error('Error fetching verification data:', error);
      }
    };
    
    fetchVerificationData();
  }, [campaign.owner, campaign.id]);

  const handleVerificationVote = async (vote: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to vote on campaign verification.',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('campaign_verifications')
        .insert({
          campaign_id: campaign.id.toString(),
          voter_id: user.id,
          is_verified: vote
        });

      if (error) throw error;

      setUserVerificationStatus(vote);
      setCanVote(false);

      toast({
        title: 'Vote Submitted',
        description: `You have ${vote ? 'verified' : 'flagged'} this campaign.`,
        variant: 'default'
      });
    } catch (error: any) {
      toast({
        title: 'Voting Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDonation = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    try {
      if (!isConnected) {
        await connectWallet();
        return;
      }

      // Validate the donation amount - ensure it's a clean number
      let donationAmountValue: number;
      try {
        // Remove any non-numeric characters except decimal point
        const cleanedValue = donationAmount.replace(/[^\d.]/g, '');
        donationAmountValue = parseFloat(cleanedValue);
        
        if (isNaN(donationAmountValue) || donationAmountValue <= 0) {
          throw new Error("Invalid amount");
        }
        
        // Limit to 18 decimal places (ETH standard)
        donationAmountValue = parseFloat(donationAmountValue.toFixed(18));
      } catch (error) {
        toast({
          title: "Invalid donation amount",
          description: "Please enter a valid donation amount greater than 0",
          variant: "destructive"
        });
        return;
      }
      
      const remainingAmount = calculateRemainingAmount(campaign.amountCollected, campaign.target);
      
      if (donationAmountValue > remainingAmount) {
        toast({
          title: "Invalid donation amount",
          description: `You cannot donate more than the remaining amount needed (${formatEthAmount(remainingAmount)})`,
          variant: "destructive"
        });
        return;
      }
      
      if (!contract) {
        toast({
          title: "Contract not connected",
          description: "Please make sure your wallet is connected correctly",
          variant: "destructive"
        });
        return;
      }
      
      // Convert ETH to Wei for the transaction - ensure we have a clean string
      // Format with exactly 18 decimal places for ethers.js
      const cleanAmountString = donationAmountValue.toFixed(18);
      const amountInWei = ethers.utils.parseEther(cleanAmountString);
      
      // Call the contract's donateToCampaign function
      const tx = await contract.donateToCampaign(campaign.id, {
        value: amountInWei
      });
      
      toast({
        title: "Transaction submitted",
        description: "Waiting for transaction confirmation...",
        variant: "default"
      });
      
      // Wait for the transaction to be mined
      await tx.wait();
      
      // After transaction is confirmed, also record in Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('donations')
          .insert({
            campaign_id: campaign.id.toString(),
            donor_id: user.id,
            amount: donationAmountValue
          });
      }
      
      toast({
        title: "Donation successful",
        description: `Thank you for your donation of ${donationAmountValue} ETH!`,
        variant: "default"
      });
    } catch (error: any) {
      console.error("Donation error:", error);
      toast({
        title: "Donation failed",
        description: error.message || "There was a problem processing your donation",
        variant: "destructive"
      });
    }
  };

  return (
    <Link to={`/campaign/${campaign.id}`}>
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg border-gray-200 dark:border-gray-800 h-full bg-card text-card-foreground">
        <div className="aspect-video w-full overflow-hidden relative">
          <img 
            src={campaign.image || '/placeholder.svg'} 
            alt={campaign.title} 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          {isCompleted && (
            <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-40 flex items-center justify-center">
              <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 px-3 py-2">
                Completed
              </Badge>
            </div>
          )}
        </div>
        
        <CardHeader className="p-4 pb-0">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg truncate">{campaign.title}</CardTitle>
            {isCompleted ? (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>Completed</span>
              </Badge>
            ) : isGovVerified ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Gov Verified</span>
              </Badge>
            ) : campaign.isVerified ? (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>Verified</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Awaiting</span>
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
            <User className="h-3 w-3" />
            <span>by {creatorName || truncateAddress(campaign.owner)}</span>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="mb-4">
            <p className="text-muted-foreground text-sm line-clamp-2 h-10 mb-1">
              {campaign.description}
            </p>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Raised:</span>
                <span className="font-medium">{formatEthAmount(campaign.amountCollected)} / {formatEthAmount(campaign.target)}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="flex justify-between text-xs text-muted-foreground pt-2">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{campaign.donors.length} Donors</span>
              </div>
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                <span>{timeRemaining}</span>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-0 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <div className="w-full">
            <div className={`w-full text-center text-xs font-medium py-1 rounded-full ${
              isCompleted
                ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                : isGovVerified 
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                  : campaign.isVerified 
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' 
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
            }`}>
              {isCompleted 
                ? 'Campaign Completed' 
                : isGovVerified 
                  ? 'Government Verified' 
                  : campaign.isVerified 
                    ? 'Community Verified' 
                    : 'Awaiting Verification'}
            </div>
          </div>
          
          {!isCompleted && !isGovVerified && !campaign.isVerified && canVote && (
            <div className="flex justify-between w-full space-x-2">
              <Button 
                variant="outline" 
                className="w-full text-green-600 border-green-600 hover:bg-green-50" 
                onClick={(e) => {
                  e.preventDefault();
                  handleVerificationVote(true);
                }}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Verify Campaign
              </Button>
              <Button 
                variant="outline" 
                className="w-full text-red-600 border-red-600 hover:bg-red-50" 
                onClick={(e) => {
                  e.preventDefault();
                  handleVerificationVote(false);
                }}
              >
                <Flag className="mr-2 h-4 w-4" />
                Flag Campaign
              </Button>
            </div>
          )}
          
          {userVerificationStatus !== null && (
            <div className={`w-full text-center text-xs py-1 ${
              userVerificationStatus 
                ? 'text-green-600 bg-green-50' 
                : 'text-red-600 bg-red-50'
            }`}>
              {userVerificationStatus 
                ? 'You verified this campaign' 
                : 'You flagged this campaign'}
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
};

export default CampaignCard;
