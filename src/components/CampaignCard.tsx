
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Campaign } from '@/types/campaign';
import { Progress } from '@/components/ui/progress';
import { calculateProgress, formatEthAmount, calculateTimeRemaining, truncateAddress } from '@/utils/contractUtils';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, CheckCircle, Users, ShieldCheck, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface CampaignCardProps {
  campaign: Campaign;
}

const CampaignCard: React.FC<CampaignCardProps> = ({ campaign }) => {
  const progress = calculateProgress(campaign.amountCollected, campaign.target);
  const timeRemaining = calculateTimeRemaining(campaign.deadline);
  const [creatorEmail, setCreatorEmail] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchCreatorEmail = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', campaign.owner)
          .single();
          
        if (error) throw error;
        setCreatorEmail(data?.email || null);
      } catch (error) {
        console.error('Error fetching creator email:', error);
      }
    };
    
    fetchCreatorEmail();
  }, [campaign.owner]);
  
  const isGovVerified = creatorEmail?.endsWith('@gov.in') || false;

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
        
        <CardFooter className="p-4 pt-0 border-t border-gray-100 dark:border-gray-800">
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
        </CardFooter>
      </Card>
    </Link>
  );
};

export default CampaignCard;
