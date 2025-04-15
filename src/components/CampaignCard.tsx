
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Campaign } from '@/types/campaign';
import { Progress } from '@/components/ui/progress';
import { calculateProgress, formatEthAmount, calculateTimeRemaining, truncateAddress } from '@/utils/contractUtils';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, CheckCircle, Users } from 'lucide-react';

interface CampaignCardProps {
  campaign: Campaign;
}

const CampaignCard: React.FC<CampaignCardProps> = ({ campaign }) => {
  const progress = calculateProgress(campaign.amountCollected, campaign.target);
  const timeRemaining = calculateTimeRemaining(campaign.deadline);

  return (
    <Link to={`/campaign/${campaign.id}`}>
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg border-gray-200 h-full">
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
            {campaign.isVerified && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>Verified</span>
              </Badge>
            )}
          </div>
          <div className="text-gray-500 text-xs mt-1">by {truncateAddress(campaign.owner)}</div>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="mb-4">
            <p className="text-gray-600 text-sm line-clamp-2 h-10 mb-1">
              {campaign.description}
            </p>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Raised:</span>
                <span className="font-medium">{formatEthAmount(campaign.amountCollected)} / {formatEthAmount(campaign.target)}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 pt-2">
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
        
        <CardFooter className="p-4 pt-0 border-t border-gray-100">
          <div className="w-full">
            <div className={`w-full text-center text-xs font-medium py-1 rounded-full ${
              campaign.isVerified 
                ? 'bg-blue-50 text-blue-700' 
                : 'bg-amber-50 text-amber-700'
            }`}>
              {campaign.isVerified ? 'Verified Campaign' : 'Awaiting Verification'}
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
};

export default CampaignCard;
