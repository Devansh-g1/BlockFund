import { create } from 'ipfs-http-client';

// Configure IPFS - Using a public gateway
const projectId = '2PCvRIJtx5hVvQOYZdABQnO0pIx';  // This is a placeholder
const projectSecret = 'e64c1a8c5d5e9b37e1c7dfd63b2bcad8';  // This is a placeholder
const auth = 'Basic ' + btoa(projectId + ':' + projectSecret);

// Create IPFS client
const ipfs = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: auth,
  },
});

/**
 * Upload a file to IPFS
 * @param file File to upload
 * @returns IPFS URL
 */
export const uploadFileToIPFS = async (file: File): Promise<string> => {
  try {
    const fileBuffer = await readFileAsArrayBuffer(file);
    const result = await ipfs.add(fileBuffer);
    return `https://ipfs.io/ipfs/${result.path}`;
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    throw new Error('Failed to upload file to IPFS');
  }
};

/**
 * Upload multiple files to IPFS
 * @param files Array of files to upload
 * @returns Array of IPFS URLs
 */
export const uploadFilesToIPFS = async (files: File[]): Promise<string[]> => {
  try {
    const promises = files.map(file => uploadFileToIPFS(file));
    return await Promise.all(promises);
  } catch (error) {
    console.error('Error uploading files to IPFS:', error);
    throw new Error('Failed to upload files to IPFS');
  }
};

/**
 * Read a file as an ArrayBuffer
 * @param file File to read
 * @returns ArrayBuffer of the file content
 */
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Upload campaign data to IPFS
 * @param campaignData Campaign data object
 * @returns IPFS URL of the campaign data
 */
export const uploadCampaignDataToIPFS = async (campaignData: any): Promise<string> => {
  try {
    // Convert campaign data to JSON string and then to Buffer
    const jsonString = JSON.stringify(campaignData);
    const buffer = await Buffer.from(jsonString);
    
    // Upload to IPFS
    const result = await ipfs.add(buffer);
    return `https://ipfs.io/ipfs/${result.path}`;
  } catch (error) {
    console.error('Error uploading campaign data to IPFS:', error);
    throw new Error('Failed to upload campaign data to IPFS');
  }
};

/**
 * Fetch data from IPFS
 * @param ipfsUrl IPFS URL
 * @returns Fetched data
 */
export const fetchFromIPFS = async (ipfsUrl: string): Promise<any> => {
  try {
    // Extract CID from URL
    const cid = ipfsUrl.replace('https://ipfs.io/ipfs/', '');
    
    // Use HTTP fetch to get the data from IPFS gateway
    const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
    }
    
    // Check if it's JSON data
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    // Otherwise return as text
    return await response.text();
  } catch (error) {
    console.error('Error fetching from IPFS:', error);
    throw new Error('Failed to fetch data from IPFS');
  }
};
