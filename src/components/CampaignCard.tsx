
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Campaign } from '@/types/campaign';
import { Progress } from '@/components/ui/progress';
import { calculateProgress, formatEthAmount, calculateTimeRemaining, truncateAddress } from '@/utils/contractUtils';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, CheckCircle, Users, ShieldCheck, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CampaignCardProps {
  campaign: Campaign;
}

const CampaignCard: React.FC<CampaignCardProps> = ({ campaign }) => {
  const { toast } = useToast();
  const progress = calculateProgress(campaign.amountCollected, campaign.target);
  const timeRemaining = calculateTimeRemaining(campaign.deadline);
  const [isGovVerified, setIsGovVerified] = useState<boolean>(false);
  const [userVerificationStatus, setUserVerificationStatus] = useState<boolean | null>(null);
  const [canVote, setCanVote] = useState<boolean>(false);

  useEffect(() => {
    const fetchVerificationData = async () => {
      try {
        // Check if campaign is from gov.in email
        const { data: userData, error: userError } = await supabase.auth
          .admin.getUserById(campaign.owner);
          
        if (userError) throw userError;
        
        // Check if email ends with @gov.in
        const userEmail = userData?.user?.email || '';
        setIsGovVerified(userEmail.endsWith('@gov.in'));

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
        const { data: userVoteData } = await supabase
          .from('campaign_verifications')
          .select('is_verified')
          .eq('campaign_id', campaign.id.toString())
          .eq('voter_id', user?.id || '')
          .single();

        setUserVerificationStatus(userVoteData?.is_verified ?? null);
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

  return (
    <Link to={`/campaign/${campaign.id}`}>
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg border-gray-200 dark:border-gray-800 h-full bg-card text-card-foreground">
        <div className="aspect-video w-full overflow-hidden">
          <img 
            src={campaign.image || '/placeholder.svg'} 
            alt={campaign.title} 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
        </div>
        
        <CardHeader className="p-4 pb-0">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg truncate">{campaign.title}</CardTitle>
            {isGovVerified ? (
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
          <div className="text-muted-foreground text-xs mt-1">by {truncateAddress(campaign.owner)}</div>
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
              isGovVerified 
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                : campaign.isVerified 
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' 
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
            }`}>
              {isGovVerified ? 'Government Verified' : campaign.isVerified ? 'Community Verified' : 'Awaiting Verification'}
            </div>
          </div>
          
          {!isGovVerified && !campaign.isVerified && canVote && (
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
