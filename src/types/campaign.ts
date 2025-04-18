
export interface Campaign {
  id: number;
  owner: string;
  title: string;
  description: string;
  target: string;
  deadline: number;
  amountCollected: string;
  image: string;
  documents: string[];
  videos: string[];
  donors: string[];
  donations: string[];
  isVerified: boolean;
  isCompleted: boolean;  // Updated to be non-optional
  creatorName: string;   // Updated to be non-optional
}

export interface CampaignFormData {
  title: string;
  description: string;
  target: string;
  deadline: Date;
  image: File | null;
  documents: File[];
  videos: File[];
}
