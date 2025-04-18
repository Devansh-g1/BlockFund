import { ethers } from 'ethers';
import { Campaign } from '../types/campaign';

/**
 * Format campaign data from contract
 * @param campaign Raw campaign data from contract
 * @param id Campaign ID
 * @returns Formatted campaign
 */
export const formatCampaign = (campaign: any, id: number): Campaign => {
  return {
    id,
    owner: campaign.owner,
    title: campaign.title,
    description: campaign.description,
    target: ethers.utils.formatEther(campaign.target.toString()),
    deadline: Number(campaign.deadline),
    amountCollected: ethers.utils.formatEther(campaign.amountCollected.toString()),
    image: campaign.image,
    documents: campaign.documents || [],
    videos: campaign.videos || [],
    donors: campaign.donors || [],
    donations: campaign.donations?.map((donation: any) => 
      ethers.utils.formatEther(donation.toString())
    ) || [],
    isVerified: campaign.isVerified,
    isCompleted: campaign.isCompleted || false,
    creatorName: ''  // This will be populated separately
  };
};

/**
 * Calculate time remaining for a campaign
 * @param deadline Campaign deadline timestamp
 * @returns Formatted time remaining string
 */
export const calculateTimeRemaining = (deadline: number): string => {
  const currentTime = Math.floor(Date.now() / 1000);
  
  if (deadline <= currentTime) {
    return 'Campaign ended';
  }
  
  const remainingTime = deadline - currentTime;
  
  const days = Math.floor(remainingTime / 86400);
  const hours = Math.floor((remainingTime % 86400) / 3600);
  const minutes = Math.floor((remainingTime % 3600) / 60);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
  } else {
    return 'Less than a minute remaining';
  }
};

/**
 * Convert date to UNIX timestamp
 * @param date JavaScript Date object
 * @returns UNIX timestamp (seconds)
 */
export const dateToTimestamp = (date: Date): number => {
  return Math.floor(date.getTime() / 1000);
};

/**
 * Format ETH amount with 4 decimal places
 * @param amount Amount in ETH
 * @returns Formatted amount string
 */
export const formatEthAmount = (amount: string | number): string => {
  // Convert to string if it's a number
  const amountStr = typeof amount === 'number' ? amount.toString() : amount;
  const formatted = parseFloat(amountStr).toFixed(4);
  
  // Remove trailing zeros
  return formatted.replace(/\.?0+$/, '') + ' ETH';
};

/**
 * Calculate campaign progress percentage
 * @param collected Amount collected (string or number)
 * @param target Target amount (string or number)
 * @returns Progress percentage (0-100)
 */
export const calculateProgress = (collected: string | number, target: string | number): number => {
  // Convert to numbers if they're strings
  const collectedNum = typeof collected === 'string' ? parseFloat(collected) : collected;
  const targetNum = typeof target === 'string' ? parseFloat(target) : target;
  
  if (targetNum === 0 || isNaN(targetNum) || isNaN(collectedNum)) {
    return 0;
  }
  
  const percentage = (collectedNum / targetNum) * 100;
  return Math.min(Math.max(percentage, 0), 100); // Ensure value is between 0 and 100
};

/**
 * Truncate address for display
 * @param address Full Ethereum address
 * @returns Truncated address (e.g., "0x1234...abcd")
 */
export const truncateAddress = (address: string): string => {
  if (!address) return '';
  
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
