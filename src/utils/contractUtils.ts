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
    creatorName: '',  // This will be populated separately
    originalId: '' // This will store the original UUID from Supabase
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
  
  // Ensure it's a valid number
  const parsedAmount = parseFloat(amountStr);
  if (isNaN(parsedAmount)) return '0 ETH';
  
  const formatted = parsedAmount.toFixed(4);
  
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

/**
 * Calculates the remaining amount that can be donated to a campaign
 * @param amountCollected Amount already collected
 * @param targetAmount Target amount to be reached
 * @returns Remaining amount that can be donated
 */
export const calculateRemainingAmount = (amountCollected: string | number, targetAmount: string | number): number => {
  // Ensure we have valid numbers by using parseFloat and handling potential NaN values
  let collected = typeof amountCollected === 'string' ? parseFloat(amountCollected) : amountCollected;
  let target = typeof targetAmount === 'string' ? parseFloat(targetAmount) : targetAmount;
  
  // Handle NaN cases
  if (isNaN(collected)) collected = 0;
  if (isNaN(target)) target = 0;
  
  return Math.max(0, target - collected);
};

/**
 * Sanitizes and formats a donation amount for blockchain transactions
 * This ensures the value is always a valid string for ethers.utils.parseEther
 * 
 * @param amount The raw donation amount (string or number)
 * @returns A properly formatted string that can safely be used with ethers.utils.parseEther
 */
export const sanitizeDonationAmount = (amount: string | number): string => {
  // If it's already a number, convert to string with fixed precision
  if (typeof amount === 'number') {
    // Ensure the number is valid and positive
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Invalid donation amount");
    }
    // Format to exactly 18 decimal places for ethers.js
    return amount.toFixed(18);
  }
  
  // If it's a string, clean and validate it
  if (typeof amount === 'string') {
    // Remove any non-numeric characters except decimal point
    const cleanedValue = amount.replace(/[^\d.]/g, '');
    const numValue = parseFloat(cleanedValue);
    
    // Validate the cleaned value
    if (isNaN(numValue) || numValue <= 0) {
      throw new Error("Invalid donation amount");
    }
    
    // Format to exactly 18 decimal places for ethers.js
    return numValue.toFixed(18);
  }
  
  throw new Error("Invalid donation amount");
};

/**
 * Convert UUID to bytes32 for blockchain use
 * @param uuid UUID string
 * @returns bytes32 hex string
 */
export const uuidToBytes32 = (uuid: string): string => {
  if (!uuid) return '0x0000000000000000000000000000000000000000000000000000000000000000';
  const cleanUuid = uuid.replace(/-/g, ''); // remove dashes
  const hexUuid = '0x' + cleanUuid;         // add 0x prefix
  return ethers.utils.hexZeroPad(hexUuid, 32);
};

/**
 * Format campaign ID based on its type
 * @param id Campaign ID (string or number)
 * @returns Formatted ID
 */
export const formatCampaignId = (id: string | number): string => {
  // If it's already a UUID format with dashes, return as is
  if (typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  
  // If it's a bytes32 hex string (from blockchain), convert to string number
  if (typeof id === 'string' && id.startsWith('0x')) {
    return id;
  }
  
  // For numeric IDs (from older implementation), convert to string
  return id.toString();
};

/**
 * Check if campaign is verified based on verification votes
 * @param verificationVotes Array of verification votes
 * @returns Boolean indicating if campaign should be considered verified
 */
export const checkCampaignVerification = (verificationVotes: {is_verified: boolean}[]): boolean => {
  if (!verificationVotes || verificationVotes.length === 0) return false;
  
  const totalVotes = verificationVotes.length;
  const verifiedVotes = verificationVotes.filter(vote => vote.is_verified).length;
  
  // Campaign is verified if at least 50% of votes are positive
  return verifiedVotes * 2 >= totalVotes;
};