export interface Campaign {
  id: string | number;
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
  isCompleted: boolean;
  creatorName: string;
  originalId?: string; // Original UUID from Supabase
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